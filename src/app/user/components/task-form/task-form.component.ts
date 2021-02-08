import { AfterViewInit, Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular';
import { FormComponentBase } from 'mateh-ng-m-validation';
import { Task } from 'src/app/models/task.model';
import { User } from 'src/app/models/user.model';
import { AppService } from 'src/app/services/app.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-task-form',
  templateUrl: './task-form.component.html',
  styleUrls: ['./task-form.component.scss'],
})
export class TaskFormComponent
  extends FormComponentBase
  implements OnInit, AfterViewInit {
  user: User;
  taskForm: FormGroup;
  validationMessages = {
    name: { required: 'A task or idea name is required.' },
  };
  constructor(
    private modalController: ModalController,
    private fb: FormBuilder,
    private afs: AngularFirestore,
    private toastController: ToastController,
    private app: AppService,
    private auth: AuthService
  ) {
    super();
  }

  ngOnInit() {
    this.auth.user$.subscribe((u) => (this.user = u));
    this.taskForm = this.fb.group({
      name: ['', [Validators.required]],
      description: ['', []],
    });
  }

  ngAfterViewInit() {
    this.startControlMonitoring(this.taskForm);
  }

  dismiss() {
    this.modalController.dismiss();
  }

  save(close: boolean = true) {
    if (this.taskForm.valid) {
      const v = this.taskForm.value;
      const id = this.app.generatePushID();
      this.afs
        .doc<Task>(`tasks/${id}`)
        .set({
          uid: this.user.uid,
          name: v.name,
          description: v.description,
        })
        .then(async () => {
          const toast = await this.toastController.create({
            message: 'Saved!',
            duration: 1500,
          });

          toast.present();
          if (close) this.dismiss();
          else this.taskForm.reset();
        })
        .catch((err) => {
          this.app.createErrorAlert(err, ['Ok']).then((x) => x.present());
        });
    } else this.showErrors(this.taskForm);
  }
}
