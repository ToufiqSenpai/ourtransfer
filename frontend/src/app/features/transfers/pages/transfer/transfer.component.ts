import { Component } from '@angular/core';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs'
import { SendFilesComponent } from '../../components/send-files/send-files.component'

@Component({
  selector: 'app-transfer',
  imports: [
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    SendFilesComponent
  ],
  templateUrl: './transfer.component.html',
  styleUrl: './transfer.component.css'
})
export class TransferComponent {

}
