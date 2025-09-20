import { AbstractControl } from '@angular/forms';

export class FormValidatorError {
  static getFormControlErrorText(ctrl: AbstractControl, name: string): string {
    if (ctrl.hasError('required')) {
      return `${camelCaseToText(name).toUpperCase()} is required`;
    } else if (ctrl.hasError('pattern')) {
      return `${camelCaseToText(name).toUpperCase()} value is not permitted`;
    } else if (ctrl.hasError('minlength')) {
      return `${camelCaseToText(name).toUpperCase()} is short than ${ctrl.errors?.['minlength'].requiredLength}`;
    } else if (ctrl.hasError('maxlength')) {
      return `${camelCaseToText(name).toUpperCase()} is long than ${ctrl.errors?.['maxlength'].requiredLength}`;
    } else if (ctrl.hasError('email')) {
      return `${camelCaseToText(name).toUpperCase()} is not an email`;
    } else if (ctrl.hasError('min')) {
      return `${camelCaseToText(name).toUpperCase()} should be greater than ${ctrl.errors?.['min'].min}`;
    } else if (ctrl.hasError('max')) {
      return `${camelCaseToText(name).toUpperCase()} should be smaller than ${ctrl.errors?.['max'].max}`;
    } else if (ctrl.hasError('age')) {
      return `${camelCaseToText(name).toUpperCase()} should be between 1 and 120`;
    } else if (ctrl.hasError('hobbies')) {
      return `${camelCaseToText(name).toUpperCase()} should be less then 250`;
    } else if (ctrl.hasError('why')) {
      return `${camelCaseToText(name).toUpperCase()} should be less then 250`;
    } else {
      return `${camelCaseToText(name).toUpperCase()} has an error`;
    }
  }
}

function camelCaseToText(camelCalse: string): string {
  return camelCalse.replace(/([A-Z]+)/g, ' $1').replace(/([A-Z][a-z])/g, ' $1');
}
