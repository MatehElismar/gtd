import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { GooglePlus } from '@ionic-native/google-plus';
import { Platform, AlertController } from '@ionic/angular';
import { FormComponentBase } from 'mateh-ng-m-validation';
import { AppService } from 'src/app/services/app.service';
import { AuthService } from 'src/app/services/auth.service';
import { SubSink } from 'subsink';
import { Plugins } from '@capacitor/core';
const { Keyboard } = Plugins;

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage
  extends FormComponentBase
  implements OnInit, AfterViewInit, OnDestroy {
  loginForm: FormGroup;
  recover = false; //recover password mode.
  subs = new SubSink();

  validationMessages = {
    email: { required: 'Email is required', email: 'Email marformatted' },
    password: { required: 'Password is required' },
  };

  constructor(
    fb: FormBuilder,
    private router: Router,
    private auth: AuthService,
    private platform: Platform,
    private alertCtrl: AlertController,
    private app: AppService
  ) {
    super();
    this.loginForm = fb.group({
      email: [
        'matematicoelismar@gmail.com',
        [Validators.required, Validators.email],
      ],
      password: ['123456', [Validators.required]],
    });
  }

  ngOnInit() {
    // this code is duplicated in presentation.page.ts.
  }

  ngAfterViewInit() {
    this.startControlMonitoring(this.loginForm);
  }

  goToForgotPassword() {
    this.router.navigate(['/auth/forgot-password'], {
      queryParams: { email: this.loginForm.value.email },
    });
  }

  forgotPass() {
    if (this.loginForm.value.email)
      this.auth
        .sendPasswordResetEmail(this.loginForm.value.email)
        .then(async () => {
          this.recover = false;
          const alert = await this.alertCtrl.create({
            header: 'Exito',
            subHeader: 'Recupere su contrase?a',
            message:
              'Hemos enviado un correo de verificacion a ' +
              this.loginForm.value.email,
          });
          alert.present();
        })
        .catch((err) => {
          console.error('google err', err);
          this.app.createErrorAlert(err, ['Ok']).then((a) => {
            a.present();
          });
        });
    else this.showErrors(this.loginForm);
  }

  async logIn(platform: 'local' | 'google') {
    if (this.platform.is('capacitor')) {
      Keyboard.hide();
    }

    console.log('clicked login');
    // catch function
    const cat = (err) => {
      console.error('google err', err);
      this.app.createErrorAlert('Error', ['Ok']).then((a) => {
        a.present();
      });
    };

    if (platform === 'google') {
      // await this.app.createLoading();
      // this.app.loading.present();
      let googleRes: any;

      if (this.platform.is('capacitor')) {
        const googleRes = await GooglePlus.login({}).catch(cat);
        console.log('google response', googleRes);
        if (googleRes && googleRes.accessToken)
          this.auth.nativeGoogleSignin(googleRes.accessToken);
        else
          this.app.createErrorAlert(googleRes, ['Ok']).then((a) => {
            a.present();
          });
      } else {
        this.auth.googleSignin().catch(cat);
      }
    } else if (platform === 'local') {
      if (this.loginForm.valid) {
        await this.app.createLoading();
        // this.app.loading.present();
        await this.auth.localSignin(
          this.loginForm.value.email.trim().toLowerCase(),
          this.loginForm.value.password.trim()
        );
        // .catch(cat);
      } else {
        return this.showErrors(this.loginForm);
      }
    }
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
