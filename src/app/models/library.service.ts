import { Injectable } from "@angular/core";
import { Toast, EmitterService, iPayloadWrapper } from "../shared";
import { HttpClient } from "@angular/common/http";

import { AuthenticationService } from "../login/authentication.service";


import { LaCaseDirectoryItem, LaDownloadedCase, LaUploadedCase, LaLegalCase } from ".";
import { environment } from "../../environments/environment";

import { Observable, of } from "rxjs";
import { map, catchError } from "rxjs/operators";


@Injectable({
  providedIn: 'root'
})
export class LibraryService {
  get API_URL():string {
    return environment.libraryURL;
  }

  constructor(
    private http: HttpClient, 
    private aService: AuthenticationService) {
  }



  public uploadCase$(caseModel:LaUploadedCase): Observable<Array<LaCaseDirectoryItem>> {
    const rest = "/Cases/UploadCase";
    const url = `${this.API_URL}${rest}`;

    return this.http.post<iPayloadWrapper>(url,caseModel).pipe(
      map(res => {
        //Toast.success(`${res.length} case saved to server`, rest);
        return [new LaCaseDirectoryItem(res.payload[0])];
      }),
      catchError(error => {
        const msg = JSON.stringify(error, undefined, 3);
        Toast.error(msg, url);
        return of<any>(null);
      })
    );
  }


  public downloadCase$(workspace:string, fileName:string): Observable<Array<LaDownloadedCase>> {
    const rest = "/Cases/DownloadCase";
    const url = `${this.API_URL}${rest}`;

    return this.http.post<iPayloadWrapper>(url, {workspace, fileName}).pipe(
      map(res => {
        const caseData:any= res.payload[0];
        // Toast.success(`${res.length} case opened from server`, rest);
        return [new LaDownloadedCase(caseData)];
      }),
      catchError(error => {
        const msg = JSON.stringify(error, undefined, 3);
        Toast.error(msg, url);
        return of<any>();
      })
    );
  }


  public consumeDataModel(list:Array<any>):Array<LaCaseDirectoryItem> {
    const caseList = new Array<LaCaseDirectoryItem>();

    list.forEach( item => {
      const obj = new LaCaseDirectoryItem(item);
      caseList.push(obj)
    })
    
    //presort by leader and then name
    caseList.sort((a,b) => b.caseCompare(a))
    return caseList;
  }

  public getCaseDirectory$(): Observable<Array<LaCaseDirectoryItem>> {
    const rest = "/Cases/ActiveCases";
    const url = `${this.API_URL}${rest}`;

    return this.http.get<iPayloadWrapper>(url).pipe(
      map(res => {
        var caseList = this.consumeDataModel(res.payload);
       // Toast.success(`${res.length} items loaded!`, rest);
        return caseList;
      }),
      catchError(error => {
        const msg = JSON.stringify(error, undefined, 3);
        Toast.error(msg, url);
        return of<any>();
      })
    );
  }

  public caseHistory$(workspace:string, fileName:string): Observable<Array<LaCaseDirectoryItem>> {
    const rest = "/Cases/CaseHistory/";
    const url = `${this.API_URL}${rest}`;

    return this.http.post<iPayloadWrapper>(url, {workspace,fileName}).pipe(
      map(res => {
        const caseList = this.consumeDataModel(res.payload);
      //  Toast.success(`${res.length} items loaded!`, rest);
        return caseList;
      }),
      catchError(error => {
        const msg = JSON.stringify(error, undefined, 3);
        Toast.error(msg, url);
        return of<any>();
      })
    );
  }

  public getCasesInWorkspace$(workspace:string): Observable<Array<LaCaseDirectoryItem>> {
    const rest = "/Cases/ActiveCasesInWorkspace";
    const url = `${this.API_URL}${rest}/${workspace}`;

    return this.http.get<iPayloadWrapper>(url).pipe(
      map(res => {
        var caseList = this.consumeDataModel(res.payload);
       // Toast.success(`${res.length} items loaded!`, rest);
        return caseList;
      }),
      catchError(error => {
        const msg = JSON.stringify(error, undefined, 3);
        Toast.error(msg, url);
        return of<any>();
      })
    );
  }

  public getAllActiveCases$(): Observable<Array<LaCaseDirectoryItem>> {
    const rest = "/Cases/ActiveCases";
    const url = `${this.API_URL}${rest}`;

    return this.http.get<iPayloadWrapper>(url).pipe(
      map(res => {
        var caseList = this.consumeDataModel(res.payload);

        //Toast.success(`${res.length} items loaded!`, rest);
        return caseList;
      }),
      catchError(error => {
        const msg = JSON.stringify(error, undefined, 3);
        Toast.error(msg, url);
        return of<any>();
      })
    );
  }

  public getAllCases$(): Observable<Array<LaCaseDirectoryItem>> {
    const rest = "/Cases/AllCases";
    const url = `${this.API_URL}${rest}`;

    return this.http.get<iPayloadWrapper>(url).pipe(
      map(res => {
        var caseList = this.consumeDataModel(res.payload);

       // Toast.success(`${res.length} items loaded!`, rest);
        return caseList;
      }),
      catchError(error => {
        const msg = JSON.stringify(error, undefined, 3);
        Toast.error(msg, url);
        return of<any>();
      })
    );
  }


}
