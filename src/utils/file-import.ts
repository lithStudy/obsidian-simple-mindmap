import { App, Modal, Notice,  Setting, TFile } from 'obsidian';
import {removeFileExtension} from "./file-operations";
import {MindSettings} from "../main";

export class FileSelectionModal extends Modal {
    caller: Object;
    handler: Function;
    default_settings : MindSettings;

    constructor(app: App) {
        super(app);
    }

    setHandler(caller:Object, handler:Function): void {
        this.caller  = caller;
        this.handler = handler;
    }
    setDefaults(settings : MindSettings) {
        this.default_settings = settings;
    }

    onOpen() {
        const setting1 = new Setting(this.contentEl).setName("Choose json/smm File").setDesc("Choose json/smm data file to import");
        const inputDataFile = setting1.controlEl.createEl("input", {
            attr: {
                type: "file",
                multiple: true,
                accept: ".json,.smm"
            }
        });
        inputDataFile.onchange=async ()=>{
            console.log("inputDataFile.change")
            const { files:datafiles } = inputDataFile;
            if (!datafiles.length) {
                new Notice("No JSON file selected");
                return;
            }
            for (let i=0; i<datafiles.length; i++)
            {
                console.log(`Processing input file ${datafiles[i].name}`);
                let srctext = await datafiles[i].text();
                let mindDataJson = JSON.parse(srctext);
                if(mindDataJson.root){
                    srctext = JSON.stringify(mindDataJson.root)
                }
                // this.handler(null,false,srctext);
                await this.handler.call(this.caller, null,false,srctext,removeFileExtension(datafiles[i].name));

                // let is_json:boolean = datafiles[i].name.endsWith(".json");
                // let objdataarray:Array<any> = is_json ? parsejson(srctext) : [ convertCsv(srctext) ];
                // for (const objdata of objdataarray)
                //     await this.handler.call(this.caller, null,false,srctext);
            }

            new Notice("Import Finished");
            this.close();
        }

        // const setting1a = new Setting(this.contentEl).setName("file name");
        // const inputJsonUrl = setting1a.controlEl.createEl("input", {
        //     attr: {
        //         type: "string"
        //     }
        // });
        // inputJsonUrl.value ="test";
        //
        // const setting1d = new Setting(this.contentEl).setName("Data contains multiple JSON objects").setDesc("Select this option if the JSON data might contain more than one object (the selected data is split into separate objects by looking for '}\s+{' as the separator");
        // const inputMultipleJSON = setting1d.controlEl.createEl("input", {
        //     attr: {
        //         type: "checkbox"
        //     }
        // });
        // inputMultipleJSON.checked = this.default_settings.multipleJSON;
        //
        //
        //
        // const setting5 = new Setting(this.contentEl).setName("Import").setDesc("Press to start the Import Process");
        // const input5 = setting5.controlEl.createEl("button");
        // input5.textContent = "IMPORT";



        // input5.onclick = async () => {
        //
        //
        // }
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}