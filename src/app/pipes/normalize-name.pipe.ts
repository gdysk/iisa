import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'normalizeName',
})
export class NormalizeNamePipe implements PipeTransform {
  transform(value: string): string {
    if (value?.length > 0) {
      const words = value.toLowerCase().split(' ');

      const result = words.map((word) => {
        if (word.length === 0) {
          return '';
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      });

      return result.join(' ');
    }
    return '';
  }
}
