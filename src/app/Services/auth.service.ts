import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Auth, AuthResponse } from '../interfaces/auth.interface';
import { Observable } from 'rxjs/internal/Observable';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

constructor(private http: HttpClient) { }
 private apiUrl: string = 'http://localhost:3000'


  PostLogin(auth: { username: string; password: string }): Observable<any> {
    console.log(' Enviando para:', `${this.apiUrl}/usuarios`);
       return this.http.post<Auth>(`${this.apiUrl}/usuarios`, auth) 

  }

}
