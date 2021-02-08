import { Injectable } from '@angular/core';
import { AngularFirestore, CollectionReference } from '@angular/fire/firestore';
import { LoadingController, AlertController } from '@ionic/angular';

@Injectable({
  providedIn: 'root',
})
export class AppService {
  loading: HTMLIonLoadingElement;

  constructor(
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private afs: AngularFirestore
  ) {
    this.createLoading();
  }

  // Modeled after base64 web-safe chars, but ordered by ASCII.
  PUSH_CHARS =
    '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';

  // Timestamp of last push, used to prevent local collisions if you push twice in one ms.
  lastPushTime = 0;

  // We generate 72-bits of randomness which get turned into 12 characters and appended to the
  // timestamp to prevent collisions with other clients.  We store the last characters we
  // generated because in the event of a collision, we'll use those same characters except
  // "incremented" by one.
  lastRandChars = [];

  generatePushID() {
    var now = new Date().getTime();
    var duplicateTime = now === this.lastPushTime;
    this.lastPushTime = now;

    var timeStampChars = new Array(8);
    for (var i = 7; i >= 0; i--) {
      timeStampChars[i] = this.PUSH_CHARS.charAt(now % 64);
      // NOTE: Can't use << here because javascript will convert to int and lose the upper bits.
      now = Math.floor(now / 64);
    }
    if (now !== 0)
      throw new Error('We should have converted the entire timestamp.');

    var id = timeStampChars.join('');

    if (!duplicateTime) {
      for (i = 0; i < 12; i++) {
        this.lastRandChars[i] = Math.floor(Math.random() * 64);
      }
    } else {
      // If the timestamp hasn't changed since last push, use the same random number, except incremented by 1.
      for (i = 11; i >= 0 && this.lastRandChars[i] === 63; i--) {
        this.lastRandChars[i] = 0;
      }
      this.lastRandChars[i]++;
    }
    for (i = 0; i < 12; i++) {
      id += this.PUSH_CHARS.charAt(this.lastRandChars[i]);
    }
    if (id.length != 20) throw new Error('Length should be 20.');

    return id;
  }

  nextPage(opts: { data: Array<any>; field: string; limit: number }) {
    const { data, field, limit } = opts;
    if (data.length > 0) {
      const last = data[data.length - 1];
      return (ref: CollectionReference) =>
        ref.orderBy(field).startAfter(last[field]).limit(limit);
    }
  }

  prevPage(opts: { data: Array<any>; field: string; limit: number }) {
    const { data, field, limit } = opts;

    if (data.length > 0) {
      const first = data[0];
      return (ref: CollectionReference) =>
        ref.orderBy(field).endBefore(first[field]).limitToLast(limit);
    }
  }

  async getRef<T>(path: string) {
    const d = await this.afs.doc(path).ref.get();
    return d.data() as T;
  }

  async createLoading() {
    this.loading = await this.loadingCtrl.create({
      animated: true,
      backdropDismiss: true,
      message: 'Please Wait...',
      showBackdrop: true,
    });
  }

  createErrorAlert(err: any, buttons: any[]) {
    console.log(JSON.stringify(err));
    return this.alertCtrl.create({
      header: err?.name || err?.code || err?.title,
      message: err?.message,
      buttons,
    });
  }
}
