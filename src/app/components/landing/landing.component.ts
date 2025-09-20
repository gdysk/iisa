import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AbstractControl, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardFooter, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs';

import { Country, CountrySelectComponent } from '@wlucha/ng-country-select';

import { CandidateService } from '../../services/candidate.service';
import { AnalyticsService } from '../../services/analytics.service';
import { IndexedDBService, PhotoItem } from '../../services/indexeddb.service';

import { NormalizeNamePipe } from '../../pipes/normalize-name.pipe';

import { FormValidatorError } from '../../utils/form.errors';
import { Candidate } from '../../models/candidate.model';
import { phoneValidator } from '../../validators/phone.validator';

const DRAFT_KEY = 'iisa_registration_draft';

const MIN_AGE = 18;
const MAX_AGE = 100;

const MAX_TEXTAREA_LENGTH = 250;

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatCardFooter,
    CountrySelectComponent,
    NormalizeNamePipe,
  ],
})
export class LandingComponent implements OnInit, OnDestroy {
  private readonly _formBuilder = inject(FormBuilder);
  private readonly _router = inject(Router);
  private readonly _candidateService = inject(CandidateService);
  private readonly _analytics = inject(AnalyticsService);
  private readonly _idbService = inject(IndexedDBService);

  private readonly _subscriptions: Subscription[] = [];

  private _photoString: string = '';

  protected form!: FormGroup;
  protected selectedFileName: string = '';
  protected isEditing: boolean = false;

  constructor() {
    this._analytics.incrementVisits();
  }

  public ngOnInit(): void {
    this._initForm();
    this._initDraft();
    this._checkForEditableSubmission();
    this._initDraftAutosave();
  }

  public ngOnDestroy(): void {
    this._subscriptions.forEach((s) => s.unsubscribe());
  }

  private async _checkForEditableSubmission(): Promise<void> {
    const editKeys = Object.keys(localStorage).filter((key) => key.startsWith('edit_'));
    const validEditEntries = this._getValidEditEntries(editKeys);

    if (validEditEntries.length === 0) {
      this.isEditing = false;
      return;
    }

    // use the most recent (latest expiration)
    const mostRecentEntry = validEditEntries.reduce((latest, current) => (new Date(current.expires) > new Date(latest.expires) ? current : latest), validEditEntries[0]);

    await this._loadAndPatchCandidate(mostRecentEntry.id);
  }

  private _getValidEditEntries(editKeys: string[]): Array<{ id: string; expires: string }> {
    const validEntries: Array<{ id: string; expires: string }> = [];

    for (const key of editKeys) {
      const expiresStr = localStorage.getItem(key);
      if (!expiresStr) {
        continue;
      }

      const expires = new Date(expiresStr);
      const now = new Date();
      if (now > expires) {
        localStorage.removeItem(key);
        continue;
      }

      const candidateId = key.replace('edit_', '');
      validEntries.push({ id: candidateId, expires: expiresStr });
    }

    return validEntries;
  }

  private async _loadAndPatchCandidate(candidateId: string): Promise<void> {
    try {
      const candidate = this._candidateService.getById(candidateId);
      if (!candidate) {
        this._cleanupEditKey(candidateId);
        return;
      }

      this._patchFormWithCandidate(candidate, candidateId);
    } catch (error) {
      console.error('Failed to load candidate for edit:', error);
      this._cleanupEditKey(candidateId);
    }
  }

  private _patchFormWithCandidate(candidate: Candidate, candidateId: string): void {
    this.form.patchValue({
      ...candidate,
      createdAt: candidate.createdAt || new Date().toISOString(),
    });

    this.isEditing = true;

    this._restorePhoto(candidate, candidateId);

    console.log(`Loaded editable submission: ${candidateId}`);
  }

  protected startNewRegistration(): void {
    this.form.reset();
    this._photoString = '';
    this.selectedFileName = '';

    // Clean up all edit keys
    Object.keys(localStorage)
      .filter((key) => key.startsWith('edit_'))
      .forEach((key) => localStorage.removeItem(key));

    // Optionally remove draft
    localStorage.removeItem(DRAFT_KEY);

    this.isEditing = false;
  }

  private async _restorePhoto(candidate: Candidate, candidateId: string): Promise<void> {
    if (candidate.imageDataUrl) {
      this._photoString = candidate.imageDataUrl;
      return;
    }

    const photoItem = await this._idbService.getCandidatePhoto(candidateId);
    if (photoItem?.photoBase64) {
      this._photoString = photoItem.photoBase64;
      this.form.patchValue({ imageDataUrl: photoItem.photoBase64 });
    }
  }

  private _cleanupEditKey(candidateId: string): void {
    const editKey = `edit_${candidateId}`;
    localStorage.removeItem(editKey);
  }

  private _initDraftAutosave(): void {
    const subscription = this.form.valueChanges.pipe(debounceTime(1000), distinctUntilChanged()).subscribe((formValue) => {
      const hasData = Object.values(formValue).some((val) => val && typeof val === 'string' && val.trim() !== '');
      if (hasData) {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            ...formValue,
            updatedAt: new Date().toISOString(),
          })
        );
      }
    });

    this._subscriptions.push(subscription);
  }

  protected onCountrySelected(country: Country): void {
    this.form.patchValue({ country: country.translations.en });
    this.form.patchValue({ countryCode: country.alpha2 });
  }

  protected selectFile(event: any): void {
    this.selectedFileName = '';
    const selectedFile = event.target.files;

    if (selectedFile?.[0]) {
      const numberOfFiles = selectedFile?.length || 0;

      for (let i = 0; i < numberOfFiles; i++) {
        const reader = new FileReader();

        reader.onload = (e: any) => {
          const res = reader.result as string;

          this._photoString = res;

          this.form.patchValue({ imageDataUrl: res });
        };

        reader.readAsDataURL(selectedFile[i]);

        this.selectedFileName = selectedFile[i].name;
      }
    }
  }

  protected getError(control: AbstractControl | null, name: string): string {
    let error = '';

    if (control) {
      error = FormValidatorError.getFormControlErrorText(control, name);
    }
    return error;
  }

  private _initDraft(): void {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      const data = JSON.parse(draft);
      this.form.patchValue(data);
    }
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    const now = new Date().toISOString();

    const payload = {
      ...this.form.value,
      createdAt: this.form.value.id ? this.form.value.createdAt : now,
    } as Partial<Candidate>;

    // New candidate
    if (!payload.id) {
      const candidate = this._candidateService.create(payload as any);

      const editKey = `edit_${candidate.id}`;
      const expires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

      if (this._photoString) {
        await this._savePhotoToDB({ id: candidate.id, photoBase64: this._photoString });
      }

      localStorage.setItem(editKey, expires);
      localStorage.removeItem(DRAFT_KEY);
      this._analytics.incrementRegistrations();
      this._router.navigate(['/dashboard']);
    } else {
      this._candidateService.update(payload.id, payload as any);

      // If photo changed during edit, save new photo
      if (this._photoString && this._photoString !== this.form.value.imageDataUrl) {
        await this._savePhotoToDB({ id: payload.id, photoBase64: this._photoString });
        // Update the candidate's imageDataUrl if needed, but since update already patches, and photo is in IndexedDB
      }

      localStorage.removeItem(DRAFT_KEY);
      this._router.navigate(['/dashboard']);
    }
  }

  private _initForm(): void {
    this.form = this._formBuilder.nonNullable.group({
      id: [''],
      name: new FormControl('', [Validators.required]),
      email: new FormControl('', [Validators.required, Validators.email]),
      phone: new FormControl('', [Validators.required, phoneValidator()]),
      age: new FormControl('', [Validators.required, Validators.min(MIN_AGE), Validators.max(MAX_AGE)]),
      country: [''],
      countryCode: [''],
      hobbies: new FormControl('', [Validators.maxLength(MAX_TEXTAREA_LENGTH)]),
      why: new FormControl('', [Validators.maxLength(MAX_TEXTAREA_LENGTH)]),
      imageDataUrl: [''],
    });
  }

  private async _savePhotoToDB(item: PhotoItem): Promise<void> {
    await this._idbService.saveCandidatePhoto(item);
  }
}

// import { Component, inject, OnDestroy, OnInit } from '@angular/core';
// import { Router } from '@angular/router';
// import { AbstractControl, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

// import { MatButtonModule } from '@angular/material/button';
// import { MatCard, MatCardContent, MatCardFooter, MatCardHeader, MatCardTitle } from '@angular/material/card';
// import { MatFormFieldModule } from '@angular/material/form-field';
// import { MatIconModule } from '@angular/material/icon';
// import { MatInputModule } from '@angular/material/input';

// import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs';

// import { Country, CountrySelectComponent } from '@wlucha/ng-country-select';

// import { CandidateService } from '../../services/candidate.service';
// import { AnalyticsService } from '../../services/analytics.service';
// import { IndexedDBService, PhotoItem } from '../../services/indexeddb.service';

// import { NormalizeNamePipe } from '../../pipes/normalize-name.pipe';

// import { FormValidatorError } from '../../utils/form.errors';
// import { Candidate } from '../../models/candidate.model';
// import { phoneValidator } from '../../validators/phone.validator';

// const DRAFT_KEY = 'iisa_registration_draft';

// const MIN_AGE = 18;
// const MAX_AGE = 100;

// const MAX_TEXTAREA_LENGTH = 250;

// @Component({
//   selector: 'app-landing',
//   templateUrl: './landing.component.html',
//   imports: [
//     FormsModule,
//     ReactiveFormsModule,
//     MatFormFieldModule,
//     MatInputModule,
//     MatButtonModule,
//     MatIconModule,
//     MatCard,
//     MatCardHeader,
//     MatCardTitle,
//     MatCardContent,
//     MatCardFooter,
//     CountrySelectComponent,
//     NormalizeNamePipe,
//   ],
// })
// export class LandingComponent implements OnInit, OnDestroy {
//   private readonly _formBuilder = inject(FormBuilder);
//   private readonly _router = inject(Router);
//   private readonly _candidateService = inject(CandidateService);
//   private readonly _analytics = inject(AnalyticsService);
//   private readonly _idbService = inject(IndexedDBService);

//   private readonly _subscriptions: Subscription[] = [];

//   private _photoString: string = '';

//   protected form!: FormGroup;
//   protected selectedFileName: string = '';

//   constructor() {
//     this._analytics.incrementVisits();
//   }

//   public ngOnInit(): void {
//     this._initForm();
//     this._initDraft();
//     this._checkForEditableSubmission();
//     this._initDraftAutosave();
//   }

//   public ngOnDestroy(): void {
//     this._subscriptions.forEach((s) => s.unsubscribe());
//   }

//   private async _checkForEditableSubmission(): Promise<void> {
//     const editKeys = Object.keys(localStorage).filter((key) => key.startsWith('edit_'));
//     const validEditEntries = this._getValidEditEntries(editKeys);

//     if (validEditEntries.length === 0) {
//       return;
//     }

//     // use the most recent (latest expiration)
//     const mostRecentEntry = validEditEntries.reduce((latest, current) => (new Date(current.expires) > new Date(latest.expires) ? current : latest), validEditEntries[0]);

//     await this._loadAndPatchCandidate(mostRecentEntry.id);
//   }

//   private _getValidEditEntries(editKeys: string[]): Array<{ id: string; expires: string }> {
//     const validEntries: Array<{ id: string; expires: string }> = [];

//     for (const key of editKeys) {
//       const expiresStr = localStorage.getItem(key);
//       if (!expiresStr) {
//         continue;
//       }

//       const expires = new Date(expiresStr);
//       const now = new Date();
//       if (now > expires) {
//         localStorage.removeItem(key);
//         continue;
//       }

//       const candidateId = key.replace('edit_', '');
//       validEntries.push({ id: candidateId, expires: expiresStr });
//     }

//     return validEntries;
//   }

//   private async _loadAndPatchCandidate(candidateId: string): Promise<void> {
//     try {
//       const candidate = this._candidateService.getById(candidateId);
//       if (!candidate) {
//         this._cleanupEditKey(candidateId);
//         return;
//       }

//       this._patchFormWithCandidate(candidate, candidateId);
//     } catch (error) {
//       console.error('Failed to load candidate for edit:', error);
//       this._cleanupEditKey(candidateId);
//     }
//   }

//   private _patchFormWithCandidate(candidate: Candidate, candidateId: string): void {
//     this.form.patchValue({
//       ...candidate,
//       createdAt: candidate.createdAt || new Date().toISOString(),
//     });

//     this._restorePhoto(candidate, candidateId);

//     console.log(`Loaded editable submission: ${candidateId}`);
//   }

//   private async _restorePhoto(candidate: Candidate, candidateId: string): Promise<void> {
//     if (candidate.imageDataUrl) {
//       this._photoString = candidate.imageDataUrl;
//       return;
//     }

//     const photoItem = await this._idbService.getCandidatePhoto(candidateId);
//     if (photoItem?.photoBase64) {
//       this._photoString = photoItem.photoBase64;
//       this.form.patchValue({ imageDataUrl: photoItem.photoBase64 });
//     }
//   }

//   private _cleanupEditKey(candidateId: string): void {
//     const editKey = `edit_${candidateId}`;
//     localStorage.removeItem(editKey);
//   }

//   private _initDraftAutosave(): void {
//     const subscription = this.form.valueChanges.pipe(debounceTime(1000), distinctUntilChanged()).subscribe((formValue) => {
//       const hasData = Object.values(formValue).some((val) => val && typeof val === 'string' && val.trim() !== '');
//       if (hasData) {
//         localStorage.setItem(
//           DRAFT_KEY,
//           JSON.stringify({
//             ...formValue,
//             updatedAt: new Date().toISOString(),
//           })
//         );
//       }
//     });

//     this._subscriptions.push(subscription);
//   }

//   protected onCountrySelected(country: Country): void {
//     this.form.patchValue({ country: country.translations.en });
//     this.form.patchValue({ countryCode: country.alpha2 });
//   }

//   protected selectFile(event: any): void {
//     this.selectedFileName = '';
//     const selectedFile = event.target.files;

//     if (selectedFile?.[0]) {
//       const numberOfFiles = selectedFile?.length || 0;

//       for (let i = 0; i < numberOfFiles; i++) {
//         const reader = new FileReader();

//         reader.onload = (e: any) => {
//           const res = reader.result as string;

//           this._photoString = res;

//           this.form.patchValue({ imageDataUrl: res });
//         };

//         reader.readAsDataURL(selectedFile[i]);

//         this.selectedFileName = selectedFile[i].name;
//       }
//     }
//   }

//   protected getError(control: AbstractControl | null, name: string): string {
//     let error = '';

//     if (control) {
//       error = FormValidatorError.getFormControlErrorText(control, name);
//     }
//     return error;
//   }

//   private _initDraft(): void {
//     const draft = localStorage.getItem(DRAFT_KEY);
//     if (draft) {
//       const data = JSON.parse(draft);
//       this.form.patchValue(data);
//     }
//   }

//   protected async onSubmit(): Promise<void> {
//     if (this.form.invalid) return;

//     const now = new Date().toISOString();

//     const payload = {
//       ...this.form.value,
//       createdAt: this.form.value.id ? this.form.value.createdAt : now,
//     } as Partial<Candidate>;

//     // New candidate
//     if (!payload.id) {
//       const candidate = this._candidateService.create(payload as any);

//       const editKey = `edit_${candidate.id}`;
//       const expires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

//       // this._savePhotoToDB({ id: candidate.id, photoBase64: this._photoString });

//       if (this._photoString) {
//         await this._savePhotoToDB({ id: payload.id!, photoBase64: this._photoString });
//       }

//       localStorage.setItem(editKey, expires);
//       localStorage.removeItem(DRAFT_KEY);
//       this._analytics.incrementRegistrations();
//       this._router.navigate(['/dashboard']);
//     } else {
//       this._candidateService.update(payload.id, payload as any);
//       localStorage.removeItem(DRAFT_KEY);
//       this._router.navigate(['/dashboard']);
//     }
//   }

//   private _initForm(): void {
//     this.form = this._formBuilder.nonNullable.group({
//       id: [''],
//       name: new FormControl('', [Validators.required]),
//       email: new FormControl('', [Validators.required, Validators.email]),
//       phone: new FormControl('', [Validators.required, phoneValidator()]),
//       age: new FormControl('', [Validators.required, Validators.min(MIN_AGE), Validators.max(MAX_AGE)]),
//       country: [''],
//       countryCode: [''],
//       hobbies: new FormControl('', [Validators.maxLength(MAX_TEXTAREA_LENGTH)]),
//       why: new FormControl('', [Validators.maxLength(MAX_TEXTAREA_LENGTH)]),
//       imageDataUrl: [''],
//     });
//   }

//   private async _savePhotoToDB(item: PhotoItem): Promise<void> {
//     await this._idbService.saveCandidatePhoto(item);
//   }
// }
