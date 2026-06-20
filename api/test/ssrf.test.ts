import { describe, it, expect } from 'vitest';
import { isBlockedAddress, assertSafeUrl } from '../src/ssrf.js';

describe('isBlockedAddress', () => {
  it('사설/루프백/링크로컬 IPv4 차단', () => {
    for (const ip of [
      '10.0.0.1',
      '127.0.0.1',
      '192.168.1.1',
      '172.16.0.1',
      '169.254.169.254',
      '100.64.0.1',
      '0.0.0.0',
    ]) {
      expect(isBlockedAddress(ip), ip).toBe(true);
    }
  });

  it('공인 IPv4 허용', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '93.184.216.34']) {
      expect(isBlockedAddress(ip), ip).toBe(false);
    }
  });

  it('IPv6 루프백/ULA/링크로컬 차단', () => {
    expect(isBlockedAddress('::1')).toBe(true);
    expect(isBlockedAddress('fd00::1')).toBe(true);
    expect(isBlockedAddress('fe80::1')).toBe(true);
  });
});

describe('assertSafeUrl', () => {
  const publicResolver = async () => ['93.184.216.34'];

  it('http/https 외 프로토콜 거부', async () => {
    await expect(assertSafeUrl('ftp://example.com')).rejects.toMatchObject({ status: 400 });
    await expect(assertSafeUrl('file:///etc/passwd')).rejects.toMatchObject({ status: 400 });
  });

  it('localhost/내부 호스트 거부', async () => {
    await expect(assertSafeUrl('http://localhost/x')).rejects.toMatchObject({ status: 400 });
    await expect(assertSafeUrl('http://foo.local/x')).rejects.toMatchObject({ status: 400 });
  });

  it('사설 IP 리터럴 거부', async () => {
    await expect(assertSafeUrl('http://127.0.0.1/x')).rejects.toMatchObject({ status: 400 });
    await expect(
      assertSafeUrl('http://169.254.169.254/latest/meta-data'),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('공인으로 해석되는 호스트 허용', async () => {
    const url = await assertSafeUrl('https://example.com/article', publicResolver);
    expect(url.hostname).toBe('example.com');
  });

  it('사설로 해석되는 호스트 거부 (DNS 리바인딩 방어)', async () => {
    const privateResolver = async () => ['10.0.0.5'];
    await expect(assertSafeUrl('https://evil.example', privateResolver)).rejects.toMatchObject(
      { status: 400 },
    );
  });
});
