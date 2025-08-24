import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ToastConfig {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<ToastConfig[]>([]);
  toasts$: Observable<ToastConfig[]> = this.toastsSubject.asObservable();

  success(message: string, title?: string, duration: number = 5000): void {
    this.show({ type: 'success', message, title, duration });
  }

  error(message: string, title?: string, duration: number = 7000): void {
    this.show({ type: 'error', message, title, duration });
  }

  warning(message: string, title?: string, duration: number = 6000): void {
    this.show({ type: 'warning', message, title, duration });
  }

  info(message: string, title?: string, duration: number = 5000): void {
    this.show({ type: 'info', message, title, duration });
  }

  private show(config: Omit<ToastConfig, 'id'>): void {
    const toast: ToastConfig = {
      ...config,
      id: this.generateId()
    };

    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, toast]);

    if (config.duration && config.duration > 0) {
      setTimeout(() => {
        this.remove(toast.id);
      }, config.duration);
    }
  }

  remove(id: string): void {
    const currentToasts = this.toastsSubject.value;
    const filteredToasts = currentToasts.filter(toast => toast.id !== id);
    this.toastsSubject.next(filteredToasts);
  }

  clear(): void {
    this.toastsSubject.next([]);
  }

  private generateId(): string {
    return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 