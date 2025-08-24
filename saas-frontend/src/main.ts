import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Initialize and bootstrap the application
async function initializeApp() {
  try {
    console.log('🚀 Initializing SaaS Factory Application...');
    
    // Bootstrap the Angular application
    const app = await bootstrapApplication(AppComponent, appConfig);
    console.log('✅ Application bootstrapped successfully');
    return app;
  } catch (err) {
    console.error('❌ Failed to bootstrap application:', err);
    throw err;
  }
}

// Start the application
initializeApp().catch((err) => {
  console.error('❌ Application initialization failed:', err);
});
