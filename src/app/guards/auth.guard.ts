import { Injectable } from '@angular/core';
import {
  CanActivate,
  CanActivateChild,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate, CanActivateChild {
  constructor(private auth: AuthService) {}
  // canActivate(): Observable<boolean> {
  //   return this.auth.isLoggedIn();
  // }
  async canActivate(route: ActivatedRouteSnapshot) {
    const isLogged = await this.auth.isLoggedIn().toPromise();
    console.log('url', isLogged, route.url);
    if (isLogged && route.url) {
    }
    return isLogged;
  }

  canActivateChild() {
    return this.auth.isLoggedIn();
  }
}
