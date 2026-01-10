"use server";

import { Client } from "@opensearch-project/opensearch";

const OPENSEARCH_URL = process.env.OPENSEARCH_URL || "";
const OPENSEARCH_INDEX = process.env.OPENSEARCH_INDEX || "";
const USERNAME = process.env.OPENSEARCH_USERNAME || "";
const PASSWORD = process.env.OPENSEARCH_PASSWORD || "";

// OpenSearchクライアント
const osClient = new Client({
  node: OPENSEARCH_URL,
  auth: {
    username: USERNAME,
    password: PASSWORD,
  },
});

interface AozoraHit {
  _id: string;
  _score: number | null;
  _source: {
    title: string;
    summary: string;
    author: string;
  };
  highlight?: {
    [key: string]: string[];
  };
}

export interface SearchResult {
  id: string;
  title: string;
  summary: string;
  highlight: string; // ハイライトされたテキスト
  score: number; // スコア
}

export async function searchAozora(keyword: string): Promise<SearchResult[]> {
  if (!keyword) return [];

  try {
    const response = await osClient.search({
      index: OPENSEARCH_INDEX,
      body: {
        query: {
          // match ... title だけ summary だけから探す
          // multi_match ... title と summary から探す
          multi_match: {
            query: keyword,
            fields: ["title", "summary"],
            type: "most_fields",
            // operator: "and" // 飲食店を「飲食」or「店」を含む検索にしない設定
          },
        },
        highlight: {
          fields: {
            summary: {}, // summaryフィールドをハイライト対象にする
          },
          pre_tags: ['<em class="bg-yellow-200 not-italic font-bold">'],
          post_tags: ["</em>"],
        },
      },
    });
    

    const hits = response.body.hits.hits as unknown as AozoraHit[];
    
    return hits.map((hit) => ({
      id: String(hit._id),
      title: hit._source?.title ?? "No Title",
      summary: hit._source?.summary ?? "",
      highlight: hit.highlight?.summary?.[0] ?? hit._source?.summary ?? "",
      score: hit._score ?? 0,
    }));
    
  } catch (error) {
    console.error("OpenSearch Error:", error);
    throw new Error("検索中にエラーが発生しました");
  }
}