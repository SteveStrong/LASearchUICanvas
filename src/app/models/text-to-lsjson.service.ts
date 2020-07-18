import { Injectable } from "@angular/core";
import { Toast, EmitterService } from "../shared/emitter.service";
import { HttpClient } from '@angular/common/http';

import { LegalCaseService } from "./legal-case.service";
import { PredictionService } from "./prediction.service";

import { spParser, spSentence, spParagraph } from "../parser/public_api";
import { LaSentence } from ".";

import { Observable,  of } from "rxjs";
import {
  map,
  catchError
} from "rxjs/operators";


// For purposes of predicting FindingSentences, every sentence in the
// “FINDING OF FACT” section should be predicted to be a FindingSentence,
// simply because it is located in that section.

// For purposes of training the NN model, only those sentences in the
// “REASONS AND BASES …” section should be used. The sentences written
// in the “FINDING OF FACT” sections should not be used, because they are
// written very differently (and frequently look like EvidenceSentences).
// By contrast, those findings written into the “REASONS AND BASES …” section
// must be written in such a way that the reader knows from their content that
// they state findings of fact – that is, they generally have finding-attribution cues.
// And it is those sentences (written in the “REASONS AND BASES …” section) that
// are positioned along with supporting evidence and reasoning.

@Injectable({
  providedIn: 'root'
})
export class TextToLSJsonService {

  private currentFile: File;



  constructor(
    private lService: LegalCaseService,
    private predict: PredictionService,
    private http: HttpClient) {
    EmitterService.registerCommand(this, "ImportCase", this.onImportCase);
    EmitterService.processCommands(this);
  }

  setCurrentFile(file: File) {
    this.lService.setCurrentFile(file);
  }

  getCurrentFile(): File {
    return this.lService.getCurrentFile();
  }

  onImportCase(file: File) {
    this.currentFile = file;
    Toast.info("importing...", this.currentFile.name);
    this.readAndParseFile(this.currentFile);
  }


  readAndParseFile(file: File) {
    var reader = new FileReader();
    reader.onerror = event => {
      Toast.error("fail...", JSON.stringify(event.target));
    };
    reader.onload = () => {
      let data = reader.result as string;
      let json = this.parseRawText(data, file.name);

      this.lService.getDecisionRoot(undefined).subscribe(root => {

        let model = this.lService.createLegalCase(json, root);

        //create a less chatty prediction
        model.sentences.filter( item => !item.isSection).forEach( item => {
          this.predict.predictSentenceDetails(item.text, false).subscribe( result => {
            item.capturePredictionData(result);
            item.applyPredictionIfUnclassified(this.predict.defaultThreshold, this.lService.currentUsername)
          })
        })

        setTimeout(() => {
          this.lService.getCurrentCase$().next(model);
        }, 3500);

      });



      Toast.success("loaded!", file.name);
    };

    let encoding = "UTF-8"
    encoding = 'ISO-8859-4'//this is needed to pick up §§
    reader.readAsText(file, encoding);
  }

  extractNumbers(text:string){
    if ( !text ) return undefined;

    let result = '';
    for(let ch of text){
      if ( ch >= '0' && ch <= '9'){
        result += ch;
      }
    }
    return result;
  }

  parseRawText(text: string, fileName?:string) {
    let sentences = [];
    let parse = new spParser();
    let document = parse.readDocument(text);
    let justNumbers = this.extractNumbers(fileName);
    let caseNumber = document.caseNumber || justNumbers || '__NOCASE__';



    let p = 0;
    let s = 0;
    document.sections.forEach(sect => {
      let title = sect.title;

      p++;
      s = 1;
      let obj = {
        sentID: `${caseNumber}P${p}S${s}`,
        text: title.asString(),
        rhetClass: "Sentence",
        isSection: true,
      }
      sentences.push(obj)

      sect.paragraphs.forEach( prag => {

        p++;
        s = 1;
        prag.sentences.forEach( sent => {
          s++;
          let obj = {
            sentID: `${caseNumber}P${p}S${s}`,
            text: sent.asString(),
            rhetClass: "Sentence",
            isSection: false,
          }
          sentences.push(obj)
        })
      })
    })

    return {
      fileName,
      caseNumber: caseNumber,
      sentences: sentences,
      text
    }

  }



}
