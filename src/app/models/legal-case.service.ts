import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Toast, EmitterService } from "../shared/emitter.service";

import { LibraryService } from "./library.service";
import { AuthenticationService } from "../login/authentication.service";
import { TeamsService } from "./teams.service";

import { Observable, Subject, ReplaySubject, of } from 'rxjs';
import {
  map,
  catchError
} from 'rxjs/operators';

import { Tools } from '../shared'
import { saveAs } from "file-saver";
import { LaSentence, LaLegalCase, LaDecisionNode, LaDecisionRoot, LaStats, LaParagraph } from './';
import { LaUploadedCase, LaCaseCoreInfo, LaCaseDirectoryItem, LaDownloadedCase } from './';

export const sentenceRoles = [
  "All",
  "FindingSentence",
  "EvidenceSentence",
  "ReasoningSentence",
  "LegalRuleSentence",
  "CitationSentence",
  "Sentence",  //other
];

export const attributionRoles = [
  "Finding",
  "Evidence",
  "Reasoning",
  "LegalRule",
  "Citation",
];


export const polarityValues = [
  "undecided",
  "positive",
  "negative",
];


@Injectable({
  providedIn: 'root'
})
export class LegalCaseService {

  private currentFile: File;
  private currentLegalCase: LaLegalCase;
  selectedText: string = "";

  private isCaseDirty: boolean = false;
  private saveCountdown: number = 30;
  private saveInterval: any;

  modelStream$: Subject<any>;

  modelStats = {};

  constructor(
    private libraryService: LibraryService,
    private authService:AuthenticationService,
    private teamService:TeamsService,
    private http: HttpClient) {

    EmitterService.registerCommand(this, "FileOpen", this.onFileOpen);
    EmitterService.registerCommand(this, "FileSave", this.onFileSave);
    EmitterService.registerCommand(this, "AutoSave", this.onAutoSave);

    EmitterService.registerCommand(this, "SetDirty", this.onSetDirty);

    EmitterService.processCommands(this);


  }

  clearCountdown(){
    if ( this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    this.saveCountdown = 0;
  }

  resetCountdown(){
    this.clearCountdown();
    this.saveCountdown = 30;
    let funct = this.checkStatus;
    let context = this;
    this.saveInterval = setInterval(function() {
      funct(context);
    }, 1000);
  }

  checkStatus(context){
    context.saveCountdown -= 1;
    if ( context.saveCountdown <= 0 ){
      clearInterval(context.saveInterval);
      context.onAutoSave(context.currentFile.name);
    }
    return context.saveCountdown
  }

  public autoSaveCountdown():number{
    return this.saveCountdown;
  }

  getSentenceRoles(): string[] {
    return sentenceRoles.slice();
  }

  getAttributionRoles(): string[] {
    return attributionRoles.slice();
  }

  getPolarityValues(): string[] {
    let roles = polarityValues.slice();
    return roles;
  }

  splitSentence(sentence, subText: string, rhetClass: string): LaParagraph {
    let paragraph = this.currentLegalCase.splitSentence(sentence, subText, rhetClass);
    paragraph && EmitterService.broadcastCommand(this, "RefreshDisplay");
    return paragraph;
  }

  nextAttributionType(type: string): string {
    let index = attributionRoles.indexOf(type);
    if ((index++) == attributionRoles.length) {
      index = 0;
    }
    return attributionRoles[index];
  }

  nextSentenceType(type: string): string {
    let index = sentenceRoles.indexOf(type);
    if ((index++) == sentenceRoles.length) {
      index = 0;
    }
    return sentenceRoles[index];
  }

  setCurrentFile(file: File) {
    this.currentFile = file;
  }

  getCurrentFile(): File {
    return this.currentFile;
  }

  // get currentUserEmail() {
  //   const user = this.authService.currentUserValue;
  //   return user ? user.email : "unknown";
  // } 

  get currentUsername() {
    const user = this.authService.currentUserValue;
    return user ? user.username: "unknown";
  } 

  public isDirty() {
    return this.isCaseDirty;
  }

  public markAsDirty() {
    if ( !this.isCaseDirty ) {
      this.resetCountdown();
    }
    this.isCaseDirty = true;
  }

  public markAsSaved() {
    this.clearCountdown();
    this.isCaseDirty = false;
  }

  findParagraph(previous: LaSentence): LaParagraph {
    let next = this.currentLegalCase.findParagraph(previous)
    return next;
  }

  getNextSentence(previous: LaSentence): LaSentence {
    let next = this.currentLegalCase.getNextSentence(previous)
    return next;
  }

  deleteSentence(previous: LaSentence) {
    this.currentLegalCase.deleteSentence(previous)
  }

  public getCurrentCase$(): Subject<LaLegalCase> {
    if (this.modelStream$ == null) {
      this.modelStream$ = new ReplaySubject<LaLegalCase>(2);
    }
    return this.modelStream$
  }



  public getSampleCase(): Observable<LaLegalCase> {
    const filename = 'Attributes.json'

    const url = `../../assets/data/${filename}`;
    return this.http.get(url).pipe(
      map(res => {

        this.getDecisionRoot().subscribe(root => {
          let model = this.createLegalCase(res, root);
          this.getCurrentCase$().next(model);
        })

        Toast.success("loading!", filename);

        this.setCurrentFile(new File([], filename))

        return filename;
      }),
      catchError(error => {
        const msg = JSON.stringify(error, undefined, 3);
        Toast.error(error.message, url);
        return of<any>();
      })
    );
  }

  public getDecisionRoot(tree?:any): Observable<LaDecisionRoot> {

    if ( tree) {
      let stream$ = new ReplaySubject<any>(2);
      setTimeout(_ => {
        let decision = this.processDecisionRoot(tree);
        stream$.next(decision);
      }, 50)
      return stream$
    }

    const filename = 'DecisionTree.json'
    const url = `../../assets/data/${filename}`;
    return this.http.get(url).pipe(
      map(res => {
        let decision = this.processDecisionRoot(res);
        Toast.success("loaded!", filename);
        return decision;
      }),
      catchError(error => {
        const msg = JSON.stringify(error, undefined, 3);
        Toast.error(error.message, url);
        return of<any>();
      })
    );
  }

  onFileOpen(file: File) {
    this.currentFile = file;
    Toast.info("opening...", this.currentFile.name);
    this.readAndRestoreFile(this.currentFile);
  }



  onFileSave(name) {
    Toast.info("saving...", name);
    let rename = name.replace('.txt', '.json')
    this.saveCaseAs(rename);
  }

  onSetDirty() {
    this.markAsDirty();
  }

  onAutoSave(name) {
    if (this.isDirty() && this.currentFile) {
      let filename = name ? name : this.currentFile.name;
      Toast.success("auto saving...", filename);
      this.saveCaseAs(filename);
    }
  }

  readAndRestoreFile(file: File) {
    var reader = new FileReader();
    reader.onerror = event => {
      Toast.error("fail...", JSON.stringify(event.target));
    };
    reader.onload = () => {
      let data = JSON.parse(reader.result as string);

      this.getDecisionRoot(data.ruleTree).subscribe(root => {
        let model = this.createLegalCase(data, root);
        this.getCurrentCase$().next(model);
      })

      Toast.success("loading!", file.name);
    };
    reader.readAsText(file);
  }


  

  processDecisionRoot(node) {
    const tree = new LaDecisionRoot(node);
    if (node.nodes) {
      const list = Tools.isArray(node.nodes) ? node.nodes : [node.nodes];
      list.forEach(item => {
        this.processDecisionNodes(item, tree);
      });
    }
    return tree;
  }

  private processDecisionNodes(node, parent: LaDecisionNode) {
    const child = new LaDecisionNode(node);
    parent.addChild(child);

    if (node.nodes) {
      const list = Tools.isArray(node.nodes) ? node.nodes : [node.nodes];
      list.forEach(item => {
        this.processDecisionNodes(item, child);
      });
    }
    return child;
  }

  createLegalCase(data: any, root?: LaDecisionRoot): LaLegalCase {
    //process into LaSentence Objects
    let list: Array<LaSentence> = new Array<LaSentence>();

    this.currentLegalCase = new LaLegalCase({
      caseNumber: data.docID || data.caseNumber
    });

   // let workspace = this.teamService.currentWorkspace;
    let pattern = this.teamService.currentPattern;
    this.currentLegalCase.caseInfo = this.currentLegalCase.createCaseCoreInfo(data.caseInfo,pattern);

    data.sentences.forEach(item => {
      const laSent = new LaSentence(item);
      if (laSent.cleanAttributions()) {
        this.markAsDirty()
      }
      list.push(laSent);
    });

    this.currentLegalCase.createParagraphs(list);
    this.currentLegalCase.text = data.text;
    if ( root ) {
      this.currentLegalCase.attachDecisionRoot(root);
    }

    this.markAsSaved();

    return this.currentLegalCase;
  }

  resolveSentenceKeys(list) {
    if (this.hasModel()) {
      return this.currentLegalCase.resolveSentenceKeys(list)
    }
    return [];
  }

  resolveDecisionKeys(list) {
    if (this.hasModel()) {
      return this.currentLegalCase.resolveDecisionKeys(list)
    }
    return [];
  }

  hasModel() {
    return this.currentLegalCase && this.currentLegalCase.sentences;
  }

  getFilteredList(key: string) {
    return this.modelStats[key].getMembers();
  }

  getPredictedList(key: string, source: string) {
    let list = []
    if (this.modelStats[source]) {
      this.modelStats[source].getMembers().forEach(item => {
        if (item.hasPredictedClass(key) && item.hasLabeledClass(source)) {
          list.push(item)
        }
      })
    }
    list = list.sort((a, b) => { return b.predictedValue - a.predictedValue });
    return list;
  }

  computeStats() {
    this.modelStats = {};

    let list: Array<LaStats> = new Array<LaStats>();
    if (this.currentLegalCase) {

      sentenceRoles.forEach(filter => {
        let obj = new LaStats();
        obj.name = filter;
        list.push(obj);
        this.modelStats[filter] = obj;
      })

      let sentences = this.currentLegalCase.sentences;
      sentences && sentences.forEach(item => {
        let filter = item.rhetClass;
        this.modelStats[filter].addMember(item);
        this.modelStats['All'].addMember(item);
      });
    }

    return list;
  }

  saveCaseAs(fileName:string) {

    let user = this.authService.currentUserValue
    let workspace = this.teamService.currentWorkspace;
    let pattern = this.teamService.currentPattern;

    let model = this.currentLegalCase.asUploadedCase(user,workspace,pattern);
    const blob = new Blob([model.data], { type: 'text/plain;charset=utf-8' });

    if ( !user ) {
      saveAs(blob, name);
      this.markAsSaved();
      EmitterService.broadcastCommand(this, "Saved", name);
    }
    else {
      this.onSaveCaseToServer(model, pattern, (name) => {
        saveAs(blob, name);
        this.markAsSaved();
        EmitterService.broadcastCommand(this, "Saved", name);
      });
    }
  }

    //force the file to download locally
    public onDownloadFromServer(obj:LaCaseDirectoryItem) {
      this.libraryService.downloadCase$(obj.workspace, obj.fileName).subscribe( list => {
        const detail: LaDownloadedCase = list[0];
        const json = JSON.stringify(JSON.parse(detail.data),undefined,3);
        const blob = new Blob([json], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, detail.fileName);
        Toast.success("downloaded", detail.fileName);
      })
    }


  public onSaveCaseToServer(obj:LaUploadedCase, pattern:string, done:(name:string)=>void) {
    this.libraryService.uploadCase$(obj).subscribe( list => {
      const item: LaCaseDirectoryItem = list[0];
      this.currentLegalCase.caseInfo = item;

      let fileName = item.computeFileName(pattern);
      this.currentLegalCase.caseInfo.fileName = fileName;

      Toast.success("saved", fileName);
      this.setCurrentFile(new File([], fileName))

      done && done(fileName);
    }, () =>{
      done && done(obj.fileName);
    });
  }


  public onOpenCaseFromServer(obj:LaCaseDirectoryItem) {
    this.libraryService.downloadCase$(obj.workspace, obj.fileName).subscribe( list => {
      const detail: LaDownloadedCase = list[0];
      const json = JSON.parse(detail.data);
     
      this.setCurrentFile(new File([], detail.fileName))
      Toast.success("opened", detail.fileName);

      this.getDecisionRoot(json.ruleTree).subscribe(root => {
        let model = this.createLegalCase(json, root);
        this.getCurrentCase$().next(model);
      });

    })
  }



  public applyPredictionForAll(pred){
    let model = this.currentLegalCase;
    let sentences = model.sentences;
    sentences.forEach( item => {
      item.applyPredictionOfTypeIfUnclassified(pred.value, pred.name, this.currentUsername);
    })

  }


}
