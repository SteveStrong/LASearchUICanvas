import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Toast, EmitterService } from "../shared/emitter.service";
import { environment } from "../../environments/environment";

import { Observable,  of } from "rxjs";
import {
  map,
  catchError
} from "rxjs/operators";

export interface iPrediction {
  name: string;
  value: string;
}

@Injectable({
  providedIn: "root"
})
export class PredictionService {
  get API_URL():string {
    return environment.predictURL;
  }
  get defaultThreshold():number {
    return 80.0;
  }

  constructor(private http: HttpClient) {}

  // data0 = {
  //   "hasErrors": false,
  //   "errorMessage": "",
  //   "payloadCount": 1,
  //   "payload": [
  //     {
  //       "text": "ggggg",
  //       "classification": "Sentence"
  //     }
  //   ]
  // };

  predictSentenceRhetClass(text: string): Observable<any> {
    const simpleText = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"")
    const data = encodeURIComponent(simpleText);
    const url = `${this.API_URL}/Classify/${data}`;
    return this.http.get(url).pipe(
      map(res => {
        const item = res["payload"][0];
        Toast.success("predicted", item.classification);
        return item;
      }),
      catchError(error => {
        const msg = JSON.stringify(error, undefined, 3);
        Toast.error(error.message, url);
        return of<any>();
      })
    );
  }

  //data1 = {
  //   hasErrors: false,
  //   errorMessage: "",
  //   payloadCount: 1,
  //   payload: [
  //     {
  //       text: "hhhh",
  //       classification: "Sentence",
  //       predictions: {
  //         CitationSentence: "0.05748146",
  //         EvidenceSentence: "0.091949396",
  //         FindingSentence: "0.023367401",
  //         LegalRuleSentence: "0.032398645",
  //         ReasoningSentence: "0.041017935",
  //         Sentence: "0.75378513"
  //       }
  //     }
  //   ]
  // };

  predictSentenceDetails(text: string, toast=true): Observable<any> {
    const simpleText = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\t\r\n]/g,"")
    const data = encodeURIComponent(simpleText);
    const url = `${this.API_URL}/Predict/${data}`;
    return this.http.get(url).pipe(
      map(res => {
        const item = res["payload"][0];
        if ( toast ) {
          Toast.success("predicted", item.classification);
        }
        return item;
      }),
      catchError(error => {
        const msg = JSON.stringify(error, undefined, 3);
        Toast.error(error.message, url);
        return of<any>();
      })
    );
  }
}
