// 직원 게시판: 전체 공지 + 지점별 게시판. Upstash Redis 해시 'board:posts'에 글 하나당 JSON 하나로 저장한다 (2026-11-10 대표)
import crypto from "node:crypto";
import { pipeline, visitsReady } from "./visits";

export const BOARDS = [
  { id: "all", name: "전체 공지" },
  { id: "main", name: "온기PT&근막이완" },
  { id: "priv", name: "온기 근막이완" },
  { id: "sbp", name: "신반포스퀘어점" },
  { id: "sl", name: "선릉점" },
] as const;
export type BoardId = (typeof BOARDS)[number]["id"];
export const isBoard = (v: unknown): v is BoardId => BOARDS.some((b) => b.id === v);

export type Comment = { id: string; author: string; body: string; at: string };
export type Post = { id: string; board: BoardId; author: string; title: string; body: string; pinned: boolean; at: string; edited?: string; comments: Comment[] };

const KEY = "board:posts";
const demo = new Map<string, Post>();
const isDemo = () => process.env.DEMO_MODE === "1";
if (isDemo() && !demo.size) {
  demo.set("d1", { id: "d1", board: "all", author: "현승민", title: "11월 감사제 안내", body: "11월 한 달간 1주년 감사제를 진행합니다.\n회원분들께 안내 부탁드려요.", pinned: true, at: "2026-11-01T01:00:00Z", comments: [{ id: "c1", author: "송효재", body: "확인했습니다!", at: "2026-11-01T02:00:00Z" }] });
  demo.set("d2", { id: "d2", board: "sl", author: "송효재", title: "3번 룸 베드 커버 교체", body: "내일 오전에 교체 예정입니다.", pinned: false, at: "2026-11-09T09:00:00Z", comments: [] });
}

export const boardReady = () => isDemo() || visitsReady();

export async function listPosts(): Promise<Post[]> {
  let all: Post[];
  if (isDemo()) all = [...demo.values()];
  else {
    const [h] = (await pipeline([["HGETALL", KEY]])) as (string[] | null)[];
    all = [];
    for (let i = 0; h && i < h.length; i += 2) {
      try { all.push(JSON.parse(h[i + 1]) as Post); } catch { /* 깨진 글은 건너뜀 */ }
    }
  }
  return all.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.at.localeCompare(a.at));
}

async function getPost(id: string): Promise<Post | null> {
  if (isDemo()) return demo.get(id) ?? null;
  const [v] = (await pipeline([["HGET", KEY, id]])) as (string | null)[];
  return v ? (JSON.parse(v) as Post) : null;
}
async function save(p: Post) {
  if (isDemo()) demo.set(p.id, p);
  else await pipeline([["HSET", KEY, p.id, JSON.stringify(p)]]);
}

const clip = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);
const newId = () => crypto.randomBytes(6).toString("hex");

export async function createPost(input: { board: unknown; author: unknown; title: unknown; body: unknown; pinned?: unknown }) {
  if (!isBoard(input.board)) throw new Error("게시판을 골라 주세요.");
  const author = clip(input.author, 20), body = clip(input.body, 5000), title = clip(input.title, 100);
  if (!author) throw new Error("작성자를 골라 주세요.");
  if (!title && !body) throw new Error("내용을 입력해 주세요.");
  const p: Post = { id: newId(), board: input.board, author, title, body, pinned: !!input.pinned, at: new Date().toISOString(), comments: [] };
  await save(p);
  return p;
}

export async function updatePost(id: string, patch: { title?: unknown; body?: unknown; pinned?: unknown }) {
  const p = await getPost(id);
  if (!p) throw new Error("글을 찾지 못했어요.");
  if (patch.title !== undefined) p.title = clip(patch.title, 100);
  if (patch.body !== undefined) p.body = clip(patch.body, 5000);
  if (patch.pinned !== undefined) p.pinned = !!patch.pinned;
  if (patch.title !== undefined || patch.body !== undefined) p.edited = new Date().toISOString();
  await save(p);
  return p;
}

export async function deletePost(id: string) {
  if (isDemo()) demo.delete(id);
  else await pipeline([["HDEL", KEY, id]]);
}

export async function addComment(id: string, author: unknown, body: unknown) {
  const p = await getPost(id);
  if (!p) throw new Error("글을 찾지 못했어요.");
  const a = clip(author, 20), b = clip(body, 1000);
  if (!a || !b) throw new Error("작성자와 댓글을 입력해 주세요.");
  p.comments.push({ id: newId(), author: a, body: b, at: new Date().toISOString() });
  await save(p);
  return p;
}

export async function deleteComment(id: string, cid: string) {
  const p = await getPost(id);
  if (!p) throw new Error("글을 찾지 못했어요.");
  p.comments = p.comments.filter((c) => c.id !== cid);
  await save(p);
  return p;
}
