import { Injectable } from '@angular/core';

const DB_NAME = 'IISA_DB';

export interface PhotoItem {
  id: string;
  photoBase64: string;
}

@Injectable({
  providedIn: 'root',
})
export class IndexedDBService {
  private _db?: IDBDatabase;

  public async init(): Promise<void> {
    this._db = await this._openDB();
  }

  private _openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains('candidatesPhoto')) {
          db.createObjectStore('candidatesPhoto', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private _getDB(): IDBDatabase {
    if (!this._db) {
      throw new Error('IndexedDB not initialized!');
    }
    return this._db;
  }

  public async saveCandidatePhoto(photo: PhotoItem): Promise<void> {
    const db = this._getDB();

    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction('candidatesPhoto', 'readwrite');
      tx.objectStore('candidatesPhoto').put(photo);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getCandidatePhoto(id: string): Promise<PhotoItem> {
    const db = this._getDB();

    return new Promise<PhotoItem>((resolve, reject) => {
      const tx = db.transaction('candidatesPhoto', 'readonly');
      const request = tx.objectStore('candidatesPhoto').get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public getAllPhotos(): Promise<PhotoItem[]> {
    const db = this._getDB();

    return new Promise<PhotoItem[]>((resolve, reject) => {
      const tx = db.transaction('candidatesPhoto', 'readonly');
      const request = tx.objectStore('candidatesPhoto').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
