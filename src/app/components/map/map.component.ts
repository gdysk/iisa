import { Component, inject, OnDestroy, OnInit } from '@angular/core';

import { MatCard, MatCardHeader, MatCardTitle, MatCardContent } from '@angular/material/card';

import { Subscription } from 'rxjs';

import { LeafletModule } from '@bluehalo/ngx-leaflet';
import * as Leaflet from 'leaflet';
import { latLng, tileLayer, marker, MapOptions, Map, icon, Icon } from 'leaflet';

import { CandidateService } from '../../services/candidate.service';
import { GeoService } from '../../services/geo.service';
import { Candidate } from '../../models/candidate.model';

@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './map.component.html',
  imports: [LeafletModule, MatCard, MatCardHeader, MatCardTitle, MatCardContent],
})
export class MapComponent implements OnInit, OnDestroy {
  private readonly _candidateService = inject(CandidateService);
  private readonly _geoService = inject(GeoService);

  private readonly _subscriptions: Subscription[] = [];

  private _candidates: Candidate[] = [];
  private _map!: Map;
  private _countryCoords: { [key: string]: { lat: number; lon: number } } = {};

  protected dataAvailable: boolean = false;
  protected isLoading: boolean = true;

  protected layers: Leaflet.Layer[] = [];

  protected mapOptions: MapOptions = {
    layers: [
      tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }),
    ],
    zoom: 2,
    center: latLng(20, 0),
  };

  public ngOnInit(): void {
    this._initCandidatesListSubscription();
  }

  public ngOnDestroy(): void {
    this._subscriptions.forEach((s) => s.unsubscribe());
  }

  protected onMapReady(map: Map): void {
    this._map = map;
    this._addUserMarkers();
  }

  private _initCandidatesListSubscription() {
    let subscription = this._candidateService.getCandidateListObservable().subscribe((list) => {
      this._candidates = list;
      this.dataAvailable = list.length > 0;
      this.isLoading = false;

      this._fetchCountryCoordinates().then(() => {
        this._addUserMarkers();
      });
    });

    this._subscriptions.push(subscription);
  }

  private async _fetchCountryCoordinates(): Promise<void> {
    for (const user of this._candidates) {
      if (user?.countryCode && !this._countryCoords[user.countryCode]) {
        try {
          const geo = await this._geoService.getCountryLocation(user.countryCode);

          if (geo?.length === 2 && typeof geo[0] === 'number' && typeof geo[1] === 'number') {
            this._countryCoords[user.countryCode] = {
              lat: geo[0],
              lon: geo[1],
            };
          } else {
            console.warn(`No valid coordinates found for ${user.country} (${user.countryCode})`);
          }
        } catch (error) {
          console.error(`Error fetching coordinates for ${user.country} (${user.countryCode}):`, error);
        }
      }
    }
  }

  private _addUserMarkers(): void {
    this.layers = this._candidates
      .map((user) => {
        const coords = this._countryCoords[user.countryCode];

        if (coords && typeof coords.lat === 'number' && typeof coords.lon === 'number') {
          return marker([coords.lat, coords.lon], {
            title: user.name,
            icon: icon({
              ...Icon.Default.prototype.options,
              iconUrl: 'assets/marker-icon.png',
              iconRetinaUrl: 'assets/marker-icon-2x.png',
              shadowUrl: 'assets/marker-shadow.png',
            }),
          }).bindPopup(`<b>${user.name}</b><br>${user.country}`);
        }

        console.warn(`No valid coordinates available for ${user.country} (${user.countryCode})`);
        return null;
      })
      .filter((layer): layer is Leaflet.Marker => layer !== null);

    const validCoords: Leaflet.LatLngTuple[] = this._candidates
      .map((user) => this._countryCoords[user.countryCode])
      .filter((coords): coords is { lat: number; lon: number } => coords !== undefined && typeof coords.lat === 'number' && typeof coords.lon === 'number')
      .map((coords) => [coords.lat, coords.lon] as [number, number]);

    if (validCoords.length > 0 && this._map) {
      const bounds = Leaflet.latLngBounds(validCoords);
      this._map.fitBounds(bounds, { padding: [50, 50] });
    } else if (validCoords.length === 0) {
      console.warn('No valid coordinates to set map bounds.');
    }
  }
}
