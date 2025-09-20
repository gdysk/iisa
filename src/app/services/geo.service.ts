import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { firstValueFrom } from 'rxjs/internal/firstValueFrom';

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GeoService {
  private readonly _httpClient = inject(HttpClient);

  private readonly _countryGeo = new Map<string, number[]>();

  public async getCountryLocation(countryCode: string): Promise<number[]> {
    const min = 1;
    const max = 100;

    let position: number[] = [];

    if (this._countryGeo.has(countryCode)) {
      let location = this._countryGeo.get(countryCode);

      if (location) {
        const offset = Math.floor(Math.random() * (max - min + 1)) + min;
        position = [location[0] + offset, location[1] + offset];
      }
    } else {
      const response = await firstValueFrom(this._httpClient.get<any>(`${environment.apiUrl}${countryCode.toUpperCase()}.json`));
      const countryInfo = typeof response === 'string' ? JSON.parse(response) : response;

      position = countryInfo?.Results?.GeoPt;
      this._countryGeo.set(countryCode, position);
    }

    return position;
  }
}
