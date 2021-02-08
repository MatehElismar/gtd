import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { ModalController } from '@ionic/angular';
import { Task } from 'src/app/models/task.model';
import { User } from 'src/app/models/user.model';
import { AuthService } from 'src/app/services/auth.service';
import { TaskFormComponent } from '../components/task-form/task-form.component';

@Component({
  selector: 'app-capture',
  templateUrl: './capture.page.html',
  styleUrls: ['./capture.page.scss'],
})
export class CapturePage implements OnInit {
  user: User;
  tasks = new Array<Task>();

  constructor(
    private modalController: ModalController,
    private afs: AngularFirestore,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.auth.user$.subscribe((u) => {
      this.user = u;
      this.afs
        .collection<Task>('tasks', (res) =>
          res.where('uid', '==', this.user.uid)
        )
        .valueChanges()
        .subscribe((tasks) => (this.tasks = tasks));
    });
  }

  async showTaskForm() {
    const modal = await this.modalController.create({
      component: TaskFormComponent,
      componentProps: {},
    });
    await modal.present();
  }
}
