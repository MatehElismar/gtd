import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UserRoutingModule } from './user-routing.module';
import { TaskFormComponent } from './components/task-form/task-form.component';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MatInputModule } from '@angular/material/input';

@NgModule({
  declarations: [TaskFormComponent],
  imports: [
    CommonModule,
    IonicModule,
    MatInputModule,
    UserRoutingModule,
    ReactiveFormsModule,
  ],
})
export class UserModule {}
