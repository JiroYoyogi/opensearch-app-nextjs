# OpenSearchのセットアップ

## ドメイン作成

### 名前

- ドメイン名
  - aozora

### ドメイン作成方法

- ドメイン作成方法
  - 標準作成

### テンプレート

- テンプレート
  - 開発/テスト

### デプロイオプション

- デプロイオプション
  - スタンバイなしのドメイン
- アベイラビリティーゾーン
  - 1-AZ（何個の AZ に配置するか）

### エンジンのオプション

- バージョン
 - 3.3(最新) - recommended
 
※ 2026.1.11時点。その時々で最新を選べばOK

### データノードの数

- インスタンスファミリー
  - 汎用
- インスタンスタイプ
  - t3.small.search
- データノードの数
  - 1（最安。ただし負荷分散なし）
- ノードあたりの EBS ストレージサイズ
  - 20

### ネットワーク

- ネットワーク
  - パブリックアクセス

### きめ細かなアクセスコントロール

- マスターユーザー
  - マスターユーザーを作成
- マスターユーザー名
  - `aozoramaster`（任意のもの）
- マスターパスワード
  - `Bluesky123#`（任意のもの）

### アクセスポリシー

- ドメインアクセスポリシー
  - ドメインレベルのアクセスポリシーを設定
- ビジュアルエディタ
  - 発信元IPアドレスで自身のIPアドレスを許可

# インデックス作成

## コマンド

```
PUT /aozora
{
  "settings": {
    "analysis": {
      "char_filter": {
        "nfkc_cf": {
          "type": "icu_normalizer",
          "name": "nfkc_cf"
        }
      },
      "tokenizer": {
        "my_kuromoji_tokenizer": {
          "type": "kuromoji_tokenizer"
        }
      },
      "analyzer": {
        "my_kuromoji_analyzer": {
          "type": "custom",
          "char_filter": ["nfkc_cf"],
          "tokenizer": "my_kuromoji_tokenizer",
          "filter": [
            "kuromoji_number",
            "kuromoji_baseform",
            "kuromoji_part_of_speech",
            "ja_stop",
            "kuromoji_stemmer",
            "lowercase"
          ]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "my_kuromoji_analyzer"
      },
      "summary": {
        "type": "text",
        "analyzer": "my_kuromoji_analyzer"
      },
      "author": {
        "type": "keyword"
      }
    }
  }
}
```

## char_filter

形態素解析前に原文を変換

- icu_normalizer
  - 「㌢」→ センチメートル、「①」→ 1 など

## token filter

形態素解析後に変換・削除

- kuromoji_number
  - 漢数字をアラビア数字に正規化。例：「十」→ 10
- kuromoji_baseform
  - 正規化。例：「食べた」→「食べる」
- kuromoji_part_of_speech
  - 助詞などを除外
- ja_stop
  - これ、それ、あれなどの不用語を除外
- kuromoji_stemmer 
  - 語尾を正規化。例：「ユーザー」→「ユーザ」
- lowercase
  - 小文字→大文字。例：「AWS」→「aws」

# データ投入と検索

## データ投入

1つ目

```
POST /aozora/_doc/1
{
  "title": "小説総論",
  "summary": "『小説総論』は、小説の本質や批評の方法について論じた作品であり、著者は小説を理解するためにはまずその本義を知る必要があると主張しています。",
  "author": "二葉亭四迷"
}
```

2つ目

```
POST /aozora/_doc/2
{
  "title": "ボヘミアの醜聞",
  "summary": "『ボヘミアの醜聞』は、アーサー・コナン・ドイルによるシャーロック・ホームズの短編小説で、ホームズと彼の友人ワトソン博士の関係を描きつつ、ボヘミア王室に関わるスキャンダルを解決する物語です。",
  "author": "アーサー・コナン・ドイル"
}
```

3つ目

```
POST /aozora/_doc/3
{
  "title": "夏秋表",
  "summary": "『夏秋表』は、作者が自然と虫、花との交感を通じて、季節の移ろいと自己の内面を探求する作品です。",
  "author": "立原道造"
}
```

## データ検索

- **全件表示** (デフォルト10件、sizeで指定)

```
GET /aozora/_search
{
  "query": {
    "match_all": {}
  },
  "size": 100
}
```

- **特定フィールドのみ検索** (match)

```
GET /aozora/_search
{
  "query": {
    "match": {
      "summary": "小説"
    }
  }
}
```

- **複数フィールドから検索** (multi_match)

```
GET /aozora/_search
{
  "query": {
    "multi_match": {
      "query": "小説",
      "fields": ["title", "summary"]
    }
  }
}
```

- **条件の組み合わせ** (bool) ... 「Aを含むがBは含まない」など

```
GET /aozora/_search
{
  "query": {
    "bool": {
      "must": [
        { "match": { "summary": "小説" } }
      ],
      "must_not": [
        { "match": { "title": "小説" } }
      ]
    }
  }
}
```

# プログラムでデータ投入

環境変数をセット

```
OPENSEARCH_URL=
OPENSEARCH_INDEX=
OPENSEARCH_USERNAME=
OPENSEARCH_PASSWORD=
```

Nodeモジュールのインストール

```
npm install
```

データのアップロードプログラムを実行

```
npm run upload-data
```

データ件数を確認

```
GET /aozora/_count
```

summaryに「小説」を含むデータ件数を確認

```
GET /aozora/_count
{
  "query": {
    "match": {
      "summary": "小説"
    }
  }
}
```

# Next.jsアプリから検索

```
npm run dev
```

or検索、and検索の切り替え。`actions/search.ts`の下記を変更

```
operator: "or" 
↓
operator: "and" 
```