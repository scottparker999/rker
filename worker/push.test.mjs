// node --test worker/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { b64u, createVapidKeys, encryptPayload } from "./push.js";

const { subtle } = globalThis.crypto;
const enc = new TextEncoder();

async function fakeDevice() {
  const kp = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const auth = crypto.getRandomValues(new Uint8Array(16));
  const pub = new Uint8Array(await subtle.exportKey("raw", kp.publicKey));
  return { kp, auth, pub, sub: { endpoint: "https://web.push.apple.com/abc", keys: { p256dh: b64u.encode(pub), auth: b64u.encode(auth) } } };
}
async function hkdf(salt, ikm, info, n) {
  const k = await subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, k, n * 8));
}
// what the phone does: RFC 8291 decryption, written independently of push.js
async function decrypt(device, body) {
  const salt = body.slice(0, 16), idlen = body[20], asPub = body.slice(21, 21 + idlen), ct = body.slice(21 + idlen);
  assert.equal(new DataView(body.buffer, body.byteOffset).getUint32(16), 4096);
  const asKey = await subtle.importKey("raw", asPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await subtle.deriveBits({ name: "ECDH", public: asKey }, device.kp.privateKey, 256));
  const info = new Uint8Array([...enc.encode("WebPush: info\0"), ...device.pub, ...asPub]);
  const ikm = await hkdf(device.auth, shared, info, 32);
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const key = await subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
  const pt = new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, ct));
  assert.equal(pt[pt.length - 1], 2, "final-record delimiter");
  return new TextDecoder().decode(pt.slice(0, -1));
}

test("a message encrypted for a device decrypts on that device", async () => {
  const device = await fakeDevice();
  const msg = JSON.stringify({ title: "Pull + arms today", body: "About 50 min." });
  const body = await encryptPayload(device.sub, msg);
  assert.equal(await decrypt(device, body), msg);
});

test("each message uses a fresh key and salt", async () => {
  const device = await fakeDevice();
  const a = await encryptPayload(device.sub, "x"), b = await encryptPayload(device.sub, "x");
  assert.notDeepEqual(a.slice(0, 86), b.slice(0, 86));
});

test("VAPID keys sign tokens the public key verifies", async () => {
  const v = await createVapidKeys();
  assert.equal(b64u.decode(v.publicKey).length, 65);
  const priv = await subtle.importKey("jwk", v.privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const pub = await subtle.importKey("raw", b64u.decode(v.publicKey), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  const data = enc.encode("header.claims");
  const sig = await subtle.sign({ name: "ECDSA", hash: "SHA-256" }, priv, data);
  assert.equal(new Uint8Array(sig).length, 64, "raw r||s, as JWS ES256 requires");
  assert.ok(await subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pub, sig, data));
});
