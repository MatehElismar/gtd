import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/auth';
import { tap, map, take } from 'rxjs/operators';
import firebase from 'firebase/app';
import { AngularFireFunctions } from '@angular/fire/functions';
import { AppService } from './app.service';
import { Role, User } from '../models/user.model';
import { Platform } from '@ionic/angular';
import { GooglePlus } from '@ionic-native/google-plus';
import { SubSink } from 'subsink';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  user$: Observable<User>;
  subs = new SubSink();

  constructor(
    private afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    private router: Router,
    private fireFunctions: AngularFireFunctions,
    private platform: Platform,
    private app: AppService
  ) {
    // Get the auth state, then fetch the Firestore user document or return null

    this.user$ = this.afAuth.authState.pipe(
      switchMap((user) => {
        // Logged in
        if (user) {
          return this.afs.doc<User>(`users/${user.uid}`).valueChanges();
        } else {
          // Logged out
          return of(null);
        }
      })
    );
  }

  sendPasswordResetEmail(email: string) {
    return this.afAuth.sendPasswordResetEmail(email, {
      url: 'http://localhost:4200/auth/login',
    });
  }

  createUser(user: User, password?: string) {
    const callable = this.fireFunctions.httpsCallable('createUser');
    return callable({ ...user, ...(password ? { password } : {}) }).pipe(
      tap((userRecord) => {
        if (!userRecord.errorInfo) {
          this.updateUserData(
            { ...userRecord, cellphone: user.cellphone },
            user.role,
            true
          ).then(() => {
            if (user.role !== 'user') {
              this.sendPasswordResetEmail(userRecord.email);
            }
          });
        }
      })
    );
  }

  enableUser(uid: string, role: Role) {
    const callable = this.fireFunctions.httpsCallable('enableUser');
    return callable({ uid }).pipe(
      tap((userRecord) => {
        if (!userRecord.errorInfo) {
          this.updateUserData(userRecord, role).then(() => {});
        }
      })
    );
  }

  disableUser(uid: string, role: Role) {
    const callable = this.fireFunctions.httpsCallable('disableUser');
    return callable({ uid }).pipe(
      tap((userRecord) => {
        if (!userRecord.errorInfo) {
          this.updateUserData(userRecord, role).then(() => {});
        }
      })
    );
  }

  async googleSignin() {
    await this.app.createLoading();
    this.app.loading.present();
    const provider = new firebase.auth.GoogleAuthProvider();
    return this.afAuth
      .signInWithPopup(provider)
      .then(async (credential) => {
        this.app.loading.dismiss();
        console.log('credential', credential);

        if (credential) {
          await this.updateUserData(
            credential.user,
            'user',
            credential.additionalUserInfo.isNewUser
          );
          return credential.user;
        }
        // else return null;
        // this.app.loading.dismiss()
        // this.appRef.tick();
      })
      .catch(async (err) => {
        console.log(err);
        this.app.loading.dismiss();
        const alert = await this.app.createErrorAlert(err, ['Ok']);
        alert.present();
        return err;
      });
  }

  async nativeGoogleSignin(token: string) {
    await this.app.createLoading();
    this.app.loading.present();

    const credential = firebase.auth.GoogleAuthProvider.credential('', token);

    return this.afAuth
      .signInWithCredential(credential)
      .then((credential) => {
        this.app.loading.dismiss();
        console.log('credential', credential);

        if (credential) {
          localStorage.setItem('loggedout', null);
          return this.updateUserData(
            credential.user,
            'user',
            credential.additionalUserInfo.isNewUser
          );
          4;
        }
        // this.app.loading.dismiss()
        // this.appRef.tick();
      })
      .catch(async (err) => {
        console.log(err);
        this.app.loading.dismiss();
        const alert = await this.app.createErrorAlert(err, ['Ok']);
        alert.present();
        throw err;
      });
  }

  async localSignin(email, password) {
    await this.app.createLoading();
    this.app.loading.present();
    return this.afAuth
      .signInWithEmailAndPassword(email, password)
      .then((x) => {
        localStorage.setItem('loggedout', null);
        return x;
      })
      .finally(() => {
        this.app.loading.dismiss();
      })
      .then((credential) => {
        console.log('credential', credential);
        /*  */ // this.app.loading.dismiss()
        // this.appRef.tick();
      })
      .catch(async (err) => {
        this.app.loading.dismiss();
        const alert = this.app.createErrorAlert(err, ['Ok']);
        (await alert).present();
        throw err;
      });
  }

  affiliateEmailToUser(uid: string, email: string) {
    const callable = this.fireFunctions.httpsCallable('affiliateEmailToUser');
    return callable({ uid, email });
  }

  updateUserData(user, role: Role, isNew: boolean = false) {
    // Sets user data to firestore on login
    const userRef: AngularFirestoreDocument<User> = this.afs.doc(
      `users/${user.uid}`
    );
    console.log(isNew);
    const data: User = {
      uid: user.uid,
      email: (user.email && user.email.toLowerCase()) || '',
      displayName: user.displayName,
      photoURL: user.photoURL,
      disabled: !!user.disabled,
    };

    console.log(data);
    return userRef.set(data, { merge: true });
  }

  async signOut() {
    await this.afAuth.signOut();
    if (this.platform.is('capacitor')) {
      GooglePlus.logout();
      localStorage.setItem('loggedout', 'true');
    }
    this.router.navigate(['/']).then((_) => {});
  }

  checkIfLogged() {
    this.app.createLoading().then(async () => {
      await this.app.loading.present();
      this.subs.sink = this.user$.subscribe(
        (user) => {
          console.log(user);
          // Con la segunda condicion evitamos acceso a la pagina sin que los usuarios de facebook provean su email.
          const logged = user && user.email !== '';
          // si estamos en la pagina login y ya estamos logueados nos dirijimos a nuestra main page
          if (logged) {
            if (
              (user.role && user.role != 'user') ||
              (user.role === 'user' && user.paypalEmail)
            ) {
              this.goToApp(user.role);
            } else if (user.role) {
              this.router.navigate(['/user/reload-balance']);
            }
            this.app.loading.dismiss();
          } else if (this.platform.is('capacitor')) {
            // check if is logged with google and if so log the user in the app.
            // esta variable indica que fue manualmente desloqueado por el usuario y la usamos para prohibir
            // que el login silencioso reloguee denuevo al usuario
            const loggedout = JSON.parse(localStorage.getItem('loggedout'));
            if (!loggedout) {
              GooglePlus.trySilentLogin()
                .then((res) => {
                  console.log('not logged', res);
                })
                .catch((err) => {
                  this.app.createLoading().then(async (r) => {
                    this.app.loading.present();
                    console.log('silent logging succesful!');
                    if (err && err.accessToken) {
                      await this.nativeGoogleSignin(err.accessToken);
                    } else {
                      this.app.createErrorAlert(err, ['Ok']).then((a) => {
                        a.present();
                      });
                    }
                  });
                })
                .finally(() => this.app.loading.dismiss());
            } else {
              this.app.loading.dismiss();
            }
          } else {
            this.app.loading.dismiss();
          }
        },
        (err) => this.app.loading.dismiss()
      );
    });
  }

  isLoggedIn() {
    return this.user$.pipe(
      take(1),
      map((user) => !!user), // <-- map to boolean
      tap((loggedIn) => {
        if (!loggedIn) {
          console.log('access denied');
          this.router.navigate(['/auth/login']);
        }
      })
    );
  }

  goToApp(role: Role) {
    const url = '/app';
    this.router.navigateByUrl(url);
  }

  // GENERATE AUTH USERS IN THE EMULATOR AUTH OFF THE USERS IN FIRESTORE.
  populateAuthUsers() {
    const callable = this.fireFunctions.httpsCallable('populateAuthUsers');
    return callable({});
  }
}
