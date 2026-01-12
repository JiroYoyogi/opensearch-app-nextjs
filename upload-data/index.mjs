import fs from "node:fs";
import path from "node:path";
import { Client } from "@opensearch-project/opensearch";
import dotenv from "dotenv";

dotenv.config();

const OPENSEARCH_URL = process.env.OPENSEARCH_URL ?? "";
const OPENSEARCH_INDEX = process.env.OPENSEARCH_INDEX ?? "";
const USERNAME = process.env.OPENSEARCH_USERNAME ?? "";
const PASSWORD = process.env.OPENSEARCH_PASSWORD ?? "";
const DATA_DIR = "./upload-data/data";

const client = new Client({
  node: OPENSEARCH_URL,
  auth: {
    username: USERNAME,
    password: PASSWORD
  },
  ssl: {
    // Docker版のOpenSearchを使う場合 false にすることが多いので合わせてる
    rejectUnauthorized: false 
  }
});

(async () => {
  try {
    const jsonList = fs
      .readdirSync(DATA_DIR)
      .filter((f) => path.extname(f).toLowerCase() === ".json");

    if (jsonList.length === 0) {
      throw new Error(`No json files found in directory: ${DATA_DIR}`);
    }

    const dataToUpload = [];

    for (const fileName of jsonList) {
      const filePath = path.join(DATA_DIR, fileName);
      const content = JSON.parse(fs.readFileSync(filePath, "utf8"));

      // [ {指示}, {データ}, {指示}, {データ} ... ]
      dataToUpload.push({ index: { _index: OPENSEARCH_INDEX, _id: content.index } });
      dataToUpload.push({
        title: content.title,
        summary: content.summary,
        author: content.author
      });

    } // for

    console.log(`Preparing to upload ${jsonList.length} documents...`);

    const response = await client.bulk({ 
      body: dataToUpload,
      refresh: true
     });

    const bulkResponse = response.body ? response.body : response;

    if (bulkResponse.errors) {
      const erroredItems = bulkResponse.items.filter(item => item.index && item.index.error);
      console.error('Failed items:', JSON.stringify(erroredItems, null, 2));
      throw new Error('Bulk upload completed with some errors.');
    }
    
    console.log(`Done. inserted/updated ${jsonList.length} docs in one batch.`);

  } catch (err) {
    console.error(err);
    process.exit(1);
  }

})();
