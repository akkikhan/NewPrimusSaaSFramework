import { Injectable, ComponentRef, ViewContainerRef } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface DialogConfig {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  disableClose?: boolean;
  buttonsDisabled?: boolean;
}

export interface DialogResult {
  confirmed: boolean;
  data?: any;
  dialog?: {
    disableButtons: () => void;
    enableButtons: () => void;
    close: () => void;
  };
}

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  private dialogSubject = new Subject<DialogConfig>();
  private resultSubject = new Subject<DialogResult>();

  dialog$ = this.dialogSubject.asObservable();
  result$ = this.resultSubject.asObservable();

  showDialog(config: DialogConfig): Observable<DialogResult> {
    this.dialogSubject.next(config);
    return this.result$;
  }

  success(title: string, message: string): Observable<DialogResult> {
    return this.showDialog({
      title,
      message,
      type: 'success',
      confirmText: 'OK',
      showCancel: false
    });
  }

  error(title: string, message: string): Observable<DialogResult> {
    return this.showDialog({
      title,
      message,
      type: 'error',
      confirmText: 'OK',
      showCancel: false
    });
  }

  warning(title: string, message: string): Observable<DialogResult> {
    return this.showDialog({
      title,
      message,
      type: 'warning',
      confirmText: 'OK',
      showCancel: false
    });
  }

  info(title: string, message: string): Observable<DialogResult> {
    return this.showDialog({
      title,
      message,
      type: 'info',
      confirmText: 'OK',
      showCancel: false
    });
  }

  confirm(title: string, message: string, confirmText: string = 'Confirm', cancelText: string = 'Cancel'): Observable<DialogResult> {
    return this.showDialog({
      title,
      message,
      type: 'confirm',
      confirmText,
      cancelText,
      showCancel: true,
      disableClose: true,
      buttonsDisabled: false
    });
  }

  sendResult(result: DialogResult) {
    this.resultSubject.next(result);
  }
}