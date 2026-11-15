import { validateEntry } from "./domain.js";
let db;
export async function openStore() {
  if (db) return db;
  db = await new Promise((resolve, reject) => {
    const request = indexedDB.open("meal-journal", 1);
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      reject(Error("打开存储超时，请关闭其他餐记标签页再重试"));
    }, 8000);
    request.onupgradeneeded = () => {
      const store = request.result;
      store.createObjectStore("entries", { keyPath: "id" });
      store.createObjectStore("training", { keyPath: "date" });
    };
    request.onsuccess = () => {
      clearTimeout(timer);
      if (settled) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => {
        request.result.close();
        db = null;
      };
      resolve(request.result);
    };
    request.onerror = () => {
      clearTimeout(timer);
      reject(request.error);
    };
    request.onblocked = () => {
      clearTimeout(timer);
      settled = true;
      reject(Error("请关闭其他餐记标签页，再重试"));
    };
  });
  return db;
}
async function transaction(stores, mode, operation) {
  const database = await openStore();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(stores, mode);
    let result, issue;
    tx.oncomplete = () =>
      resolve(typeof result === "function" ? result() : result);
    tx.onerror = () => reject(issue || tx.error || Error("存储失败"));
    tx.onabort = () => reject(issue || tx.error || Error("存储已取消"));
    try {
      result = operation(tx, (error) => {
        issue = error;
        tx.abort();
      });
    } catch (error) {
      issue = error;
      tx.abort();
    }
  });
}
export async function readAll() {
  return transaction(["entries", "training"], "readonly", (tx) => {
    const entries = tx.objectStore("entries").getAll(),
      training = tx.objectStore("training").getAll();
    return () => ({
      entries: entries.result,
      trainingDays: training.result.map((row) => row.date),
    });
  });
}
export async function saveEntry(entry, previous) {
  validateEntry(entry);
  return transaction(["entries"], "readwrite", (tx, abort) => {
    const store = tx.objectStore("entries"),
      request = store.get(entry.id);
    request.onsuccess = () => {
      try {
        if (previous && request.result?.updatedAt !== previous) {
          abort(Error("这条记录已在其他标签页修改，请关闭后重新打开"));
          return;
        }
        store.put(entry);
      } catch (error) {
        abort(error);
      }
    };
  });
}
export async function deleteEntry(id, previous) {
  return transaction(["entries"], "readwrite", (tx, abort) => {
    const store = tx.objectStore("entries"),
      request = store.get(id);
    request.onsuccess = () => {
      if (request.result?.updatedAt !== previous) {
        abort(Error("这条记录已发生变化，请重新打开后再删除"));
        return;
      }
      store.delete(id);
    };
  });
}
export async function setTraining(date, value) {
  return transaction(["training"], "readwrite", (tx) =>
    value
      ? tx.objectStore("training").put({ date })
      : tx.objectStore("training").delete(date),
  );
}
export async function importBackup(data) {
  let added = 0;
  await transaction(["entries", "training"], "readwrite", (tx, abort) => {
    const store = tx.objectStore("entries");
    for (const entry of data.entries) {
      const request = store.get(entry.id);
      request.onsuccess = () => {
        try {
          if (!request.result) {
            store.add(entry);
            added++;
          }
        } catch (error) {
          abort(error);
        }
      };
    }
    for (const date of data.trainingDays)
      tx.objectStore("training").put({ date });
  });
  return added;
}
