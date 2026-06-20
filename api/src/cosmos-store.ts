// Azure Cosmos DB 스토어 (COSMOS_ENDPOINT 설정 시 사용, 관리 ID 키리스 인증). ownerId 로 격리.
import { CosmosClient, type Container } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import {
  DEFAULT_BOARD_NAME,
  defaultBoardId,
  type Board,
  type Card,
  type Store,
  type User,
} from './types.js';
import { newBoardId } from './id.js';

const CARD_KEYS = [
  'id',
  'ownerId',
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
    ownerId: item.ownerId as string,
    name: item.name as string,
    createdAt: item.createdAt as string,
    shareId: (item.shareId as string | null) ?? null,
  };
}

function toUser(item: Record<string, unknown>): User {
  return {
    id: item.id as string,
    provider: item.provider as User['provider'],
    login: item.login as string,
    name: item.name as string,
    avatarUrl: (item.avatarUrl as string | null) ?? null,
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
  const usersName = process.env.COSMOS_USERS_CONTAINER ?? 'users';

  const client = new CosmosClient({
    endpoint,
    aadCredentials: new DefaultAzureCredential(),
  });
  const db = client.database(databaseName);
  const cards: Container = db.container(cardsName);
  const boards: Container = db.container(boardsName);
  const users: Container = db.container(usersName);

  async function getCardRaw(id: string): Promise<Card | undefined> {
    try {
      const { resource } = await cards.item(id, id).read<Record<string, unknown>>();
      return resource ? toCard(resource) : undefined;
    } catch (err) {
      if (isNotFound(err)) return undefined;
      throw err;
    }
  }

  return {
    async ensureUserSeed(ownerId) {
      const id = defaultBoardId(ownerId);
      let exists = false;
      try {
        const { resource } = await boards.item(id, id).read<Record<string, unknown>>();
        exists = Boolean(resource);
      } catch (err) {
        if (!isNotFound(err)) throw err;
        exists = false;
      }
      if (!exists) {
        await boards.items.upsert({
          id,
          ownerId,
          name: DEFAULT_BOARD_NAME,
          createdAt: new Date().toISOString(),
          shareId: null,
        });
      }
    },
    async getUser(id) {
      try {
        const { resource } = await users.item(id, id).read<Record<string, unknown>>();
        return resource ? toUser(resource) : undefined;
      } catch (err) {
        if (isNotFound(err)) return undefined;
        throw err;
      }
    },
    async upsertUser(user) {
      await users.items.upsert(user);
      return user;
    },
    async listBoards(ownerId) {
      const { resources } = await boards.items
        .query<Record<string, unknown>>({
          query: 'SELECT * FROM c WHERE c.ownerId = @o',
          parameters: [{ name: '@o', value: ownerId }],
        })
        .fetchAll();
      return resources.map(toBoard);
    },
    async getBoard(ownerId, id) {
      try {
        const { resource } = await boards.item(id, id).read<Record<string, unknown>>();
        if (!resource || resource.ownerId !== ownerId) return undefined;
        return toBoard(resource);
      } catch (err) {
        if (isNotFound(err)) return undefined;
        throw err;
      }
    },
    async createBoard(ownerId, name) {
      const board: Board = {
        id: newBoardId(),
        ownerId,
        name,
        createdAt: new Date().toISOString(),
        shareId: null,
      };
      await boards.items.create(board);
      return board;
    },
    async updateBoard(ownerId, id, patch) {
      try {
        const { resource } = await boards.item(id, id).read<Record<string, unknown>>();
        if (!resource || resource.ownerId !== ownerId) return undefined;
        const updated: Board = {
          ...toBoard(resource),
          ...patch,
        };
        await boards.items.upsert(updated);
        return updated;
      } catch (err) {
        if (isNotFound(err)) return undefined;
        throw err;
      }
    },
    async getBoardByShareId(shareId) {
      if (!shareId) return undefined;
      const { resources } = await boards.items
        .query<Record<string, unknown>>({
          query: 'SELECT * FROM c WHERE c.shareId = @s',
          parameters: [{ name: '@s', value: shareId }],
        })
        .fetchAll();
      return resources[0] ? toBoard(resources[0]) : undefined;
    },
    async listCardsByBoardId(boardId) {
      const { resources } = await cards.items
        .query<Record<string, unknown>>({
          query: 'SELECT * FROM c WHERE c.boardId = @b',
          parameters: [{ name: '@b', value: boardId }],
        })
        .fetchAll();
      return resources.map(toCard);
    },
    async addCard(card) {
      await cards.items.create(card);
      return card;
    },
    async getCard(ownerId, id) {
      const card = await getCardRaw(id);
      return card && card.ownerId === ownerId ? card : undefined;
    },
    async listCards(ownerId, boardId) {
      const spec = boardId
        ? {
            query: 'SELECT * FROM c WHERE c.ownerId = @o AND c.boardId = @b',
            parameters: [
              { name: '@o', value: ownerId },
              { name: '@b', value: boardId },
            ],
          }
        : {
            query: 'SELECT * FROM c WHERE c.ownerId = @o',
            parameters: [{ name: '@o', value: ownerId }],
          };
      const { resources } = await cards.items
        .query<Record<string, unknown>>(spec)
        .fetchAll();
      return resources.map(toCard);
    },
    async updateCard(ownerId, id, patch) {
      const existing = await getCardRaw(id);
      if (!existing || existing.ownerId !== ownerId) return undefined;
      const updated: Card = {
        ...existing,
        ...patch,
        id: existing.id,
        ownerId: existing.ownerId,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };
      await cards.items.upsert(updated);
      return updated;
    },
    async deleteCard(ownerId, id) {
      const existing = await getCardRaw(id);
      if (!existing || existing.ownerId !== ownerId) return false;
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
