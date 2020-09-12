import { Component, OnInit, Input } from '@angular/core';
import { SearchResult } from '../models';

@Component({
  selector: 'app-document-set',
  templateUrl: './document-set.component.html',
  styleUrls: ['./document-set.component.scss']
})
export class DocumentSetComponent implements OnInit {
  @Input() searchResults: Array<SearchResult> = [];


  throttle = 300;
  scrollDistance = 1;

  constructor() { }

  ngOnInit(): void {
  }

  onScrollDown() {
    // if (!this.pinnedView && this.nextPageUrl) {
    //     const s1 = this.service.searchNextPage$(this.nextPageUrl, this.currentPinContext, this.user).subscribe(({ payload, nextPageUrl }) => {
    //         this.payload = this.payload.concat(payload);
    //         this.displayResults = this.payload;
    //         this.nextPageUrl = nextPageUrl;
    //         s1.unsubscribe();
    //     });
    // }
  }

}

