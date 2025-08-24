import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'replace',
  standalone: true
})
export class ReplacePipe implements PipeTransform {
  transform(value: string, find: string, replace: string): string {
    if (!value) return value;
    return value.split(find).join(replace);
  }
}
