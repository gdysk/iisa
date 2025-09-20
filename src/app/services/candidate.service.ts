import { Injectable, signal } from '@angular/core';

import { toObservable } from '@angular/core/rxjs-interop';

import { Observable } from 'rxjs/internal/Observable';

import { v4 as uuidv4 } from 'uuid';

import { Candidate } from '../models/candidate.model';

const STORAGE_KEY = 'iisa_candidates_loccal_key';

@Injectable({
  providedIn: 'root',
})
export class CandidateService {
  private readonly _list = signal<Candidate[]>(this.loadFromStorage());

  private readonly _list$: Observable<Candidate[]>;

  constructor() {
    this._list$ = toObservable(this._list);
  }

  public getCandidateListObservable(): Observable<Candidate[]> {
    return this._list$;
  }

  private loadFromStorage(): Candidate[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as Candidate[];
    } catch {
      return [];
    }
  }

  private saveToStorage(list: Candidate[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    this._list.set(list);
  }

  public getAll(): Candidate[] {
    return [...this._list()];
  }

  public create(payload: Omit<Candidate, 'id' | 'createdAt' | 'updatedAt'>): Candidate {
    const candidate: Candidate = {
      ...payload,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Candidate;

    const newList = [candidate, ...this._list()];
    this.saveToStorage(newList);

    return candidate;
  }

  public update(id: string, patch: Partial<Candidate>): Candidate | undefined {
    const newList = this._list().map((c) => (c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c));
    this.saveToStorage(newList);

    return this.getById(id);
  }

  public remove(id: string): void {
    const newList = this._list().filter((c) => c.id !== id);
    this.saveToStorage(newList);
  }

  public getById(id: string): Candidate | undefined {
    return this._list().find((c) => c.id === id);
  }
}
