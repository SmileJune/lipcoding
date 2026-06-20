// Azure Cosmos DB 스토어 (COSMOS_ENDPOINT 설정 시 사용, 관리 ID 키리스 인증).
import { CosmosClient, type Container } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import {
  DEFAULT_BOARD_ID,
  DEFAULT_BOARD_NAME,
  type Board,
  type Card,
  type Store,
} from './types.js';
import { newBoardId } from './id.js';

const CARD_KEYS = [
  'id',
  'boardId',
  'sourceUrl',
  'title',
  'summary',
  'keyPoints',
  'tags',
  'memo',
  'color',
  'posX',
  'posY',
  'imageUrl',
  'status',
  'createdAt',
  'updatedAt',
] as const;

function toCard(item: Record<string, unknown>): Card {
  const card: Record<string, unknown> = {};
  for (const key of CARD_KEYS) card[key] = item[key];
  return card as unknown as Card;
}

function toBoard(item: Record<string, unknown>): Board {
  return {
    id: item.id as string,
    name: item.name as string,
    createdAt: item.createdAt as string,
  };
}

function isNotFound(err: unknown): boolean {
  return (
    typeof err === 'object' && err !== null && (err as { code?: number }).code === 404
  );
}

export function createCosmosStore(endpoint: string = process.env.COSMOS_ENDPOINT ?? ''): Store {
  const databaseName = process.env.COSMOS_DATABASE ?? 'curio';
  const cardsName = process.env.COSMOS_CARDS_CONTAINER ?? 'cards';
  const boardsName = process.env.COSMOS_BOARDS_CONTAINER ?? 'boards';

  const client = new CosmosClient({
    endpoint,
    aadCredentials: new DefaultAzureCredential(),
  });
  const db = client.database(databaseName);
  const cards: Container = db.container(cardsName);
  const boards: Container = db.container(boardsName);

  async function getCard(id: string): Promise<Card | undefined> {
    try {
      const { resource } = await cards.item(id, id).read<Record<string, unknown>>();
      return resource ? toCard(resource) : undefined;
    } catch (err) {
      if (isNotFound(err)) return undefined;
      throw err;
    }
  }

  return {
    async ensureSeed() {
      try {
        await boards.item(DEFAULT_BOARD_ID, DEFAULT_BOARD_ID).read();
      } catch (err) {
        if (!isNotFound(err)) throw err;
        await boards.items.upsert({
          id: DEFAULT_BOARD_ID,
          name: DEFAULT_BOARD_NAME,
          createdAt: new Date().toISOString(),
        });
      }
    },
    async listBoards() {
      const { resources } = await boards.items
        .query<Record<string, unknown>>('SELECT * FROM c')
        .fetchAll();
      return resources.map(toBoard);
    },
    async getBoard(id) {
      try {
        const { resource } = await boards.item(id, id).read<Record<string, unknown>>();
        return resource ? toBoard(resource) : undefined;
      } catch (err) {
        if (isNotFound(err)) return undefined;
        throw err;
      }
    },
    async createBoard(name) {
      const board: Board = {
        id: newBoardId(),
        name,
        createdAt: new Date().toISOString(),
      };
      await boards.items.create(board);
      return board;
    },
    async addCard(card) {
      await cards.items.create(card);
      return card;
    },
    getCard,
    async listCards(boardId) {
      const spec = boardId
        ? {
            query: 'SELECT * FROM c WHERE c.boardId = @b',
            parameters: [{ name: '@b', value: boardId }],
          }
        : 'SELECT * FROM c';
      const { resources } = await cards.items
        .query<Record<string, unknown>>(spec)
        .fetchAll();
      return resources.map(toCard);
    },
    async updateCard(id, patch) {
      const existing = await getCard(id);
      if (!existing) return undefined;
      const updated: Card = {
        ...existing,
        ...patch,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };
      await cards.items.upsert(updated);
      return updated;
    },
    async deleteCard(id) {
      try {
        await cards.item(id, id).delete();
        return true;
      } catch (err) {
        if (isNotFound(err)) return false;
        throw err;
      }
    },
  };
}
