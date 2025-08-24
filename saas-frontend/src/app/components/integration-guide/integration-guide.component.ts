import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

interface GuideSection {
  title: string;
  content: string;
  codeSnippets?: any[];
  images?: any[];
  order: number;
}

interface IntegrationGuide {
  id: string;
  guideId: string;
  tenantId: string;
  idPType: string;
  title: string;
  sections: GuideSection[];
  generatedAt: string;
  version: string;
  estimatedImplementationTime: string;
}

@Component({
  selector: 'app-integration-guide',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './integration-guide.component.html',
  styleUrls: ['./integration-guide.component.scss'],
})
export class IntegrationGuideComponent implements OnInit {
  tenantId: string = '';
  loading = true;
  error: string | null = null;
  guide: IntegrationGuide | null = null;
  currentSection = 0;

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.tenantId = params['tenantId'];
      this.loadIntegrationGuide();
    });
  }

  loadIntegrationGuide() {
    this.loading = true;
    this.error = null;

    // Fetch the JSON guide data
    this.http
      .get<IntegrationGuide>(`/api/v2/tenants/${this.tenantId}/idp/guide`)
      .subscribe({
        next: (guide) => {
          this.guide = guide;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading guide:', err);
          this.error = 'Failed to load integration guide. Please try again.';
          this.loading = false;
        },
      });
  }

  downloadGuide() {
    // Implement PDF download functionality
    window.open(`/api/v2/tenants/${this.tenantId}/idp/guide/pdf`, '_blank');
  }

  retry() {
    this.loadIntegrationGuide();
  }

  copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      // You could show a toast notification here
      console.log('Code copied to clipboard');
    });
  }

  scrollToSection(index: number, event: Event) {
    event.preventDefault();
    this.currentSection = index;
    const element = document.getElementById('section-' + index);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
