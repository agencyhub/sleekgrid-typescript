import { Editor, EditorOptions, H, parsePx, Position } from "../core";

abstract class BaseEditor {
    protected _input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    protected _defaultValue: any;
    protected _args: EditorOptions;

    constructor(args: EditorOptions) {
        this._args = args;
        this.init();
    }

    abstract init(): void;

    destroy() {
        this._input.remove();
    }

    focus() {
        this._input.focus();
    }

    getValue() {
        return this._input.value;
    }

    setValue(val: string) {
        this._input.value = val;
    }

    loadValue(item: any) {
        this._defaultValue = item[this._args.column.field] ?? "";
        this._input.value = this._defaultValue;
        if ((this._input as any).select) {
            (this._input as any).defaultValue = this._defaultValue;
            (this._input as any).select();
        }
    }

    serializeValue(): any {
        return this._input.value;
    }

    applyValue(item: any, state: any) {
        item[this._args.column.field] = state;
    }

    isValueChanged() {
        return (!(this._input.value === "" && this._defaultValue == null)) && (this._input.value != this._defaultValue);
    }

    validate() {
        if (this._args.column.validator) {
            var validationResults = this._args.column.validator(this._input.value, this._args);
            if (!validationResults.valid) {
                return validationResults;
            }
        }

        return {
            valid: true,
            msg: null
        };
    }
}

export class TextEditor extends BaseEditor {

    declare _input: HTMLInputElement;

    init() {
        const input = this._input = this._args.container.appendChild(H("input", { type: "text", class: 'editor-text slick-editor-text' }));
        input.addEventListener('keydown', this._args.editorCellNavOnLRKeys ? handleKeydownLRNav : handleKeydownLRNoNav);
        input.focus();
        input.select();

        addCompositeChangeListener(this, this._args, input);
    }
}

export class IntegerEditor extends TextEditor {

    serializeValue() {
        return parseInt(this._input.value, 10) || 0;
    }

    validate() {
        if (isNaN(parseInt(this._input.value, 10))) {
            return {
                valid: false,
                msg: "Please enter a valid integer"
            };
        }

        return super.validate();
    }
}

export class FloatEditor extends TextEditor {

    static AllowEmptyValue = false;
    static DefaultDecimalPlaces: number = null;

    getDecimalPlaces(): number {
        // returns the number of fixed decimal places or null
        var rtn = this._args.column.editorFixedDecimalPlaces;
        if (typeof rtn === 'undefined') {
            rtn = FloatEditor.DefaultDecimalPlaces;
        }
        return (!rtn && rtn !== 0 ? null : rtn);
    }

    loadValue(item: any) {
        this._defaultValue = item[this._args.column.field];

        var decPlaces = this.getDecimalPlaces();
        if (decPlaces !== null
            && (this._defaultValue || this._defaultValue === 0)
            && (this._defaultValue as any).toFixed) {
            this._defaultValue = (this._defaultValue as any).toFixed(decPlaces);
        }

        this._input.value = this._defaultValue;
        this._input.defaultValue = this._defaultValue;
        this._input.select();
    }

    serializeValue() {
        var rtn = parseFloat(this._input.value) as any;
        if (FloatEditor.AllowEmptyValue) {
            if (!rtn && rtn !== 0)
                rtn = '';
        } else {
            rtn = rtn || 0;
        }

        var decPlaces = this.getDecimalPlaces();
        if (decPlaces !== null
            && (rtn || rtn === 0)
            && rtn.toFixed) {
            rtn = parseFloat(rtn.toFixed(decPlaces));
        }

        return rtn;
    }

    validate() {
        if (isNaN(parseFloat(this._input.value))) {
            return {
                valid: false,
                msg: "Please enter a valid number"
            };
        }

        return super.validate();
    }
}

export class DateEditor extends TextEditor {
    private _calendarOpen = false;

    init() {
        super.init();

        // @ts-ignore
        (($ as any)(this._input) as any).datepicker({
            showOn: "button",
            buttonImage: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' class='bi bi-calendar' viewBox='0 0 16 16'%3E%3Cpath d='M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z'/%3E%3C/svg%3E`,
            buttonImageOnly: true,
            beforeShow: () => {
                this._calendarOpen = true;
            },
            onClose: () => {
                this._calendarOpen = false;
                if (this._args.compositeEditorOptions)
                    triggerCompositeEditorChange(this, this._args);
            }
        });

        this._input.style.width = (parsePx(getComputedStyle(this._input).width) - (!this._args.compositeEditorOptions ? 18 : 28)) + 'px';
    }

    destroy() {
        // @ts-ignore
        ($ as any).datepicker.dpDiv.stop(true, true);
        // @ts-ignore
        (($ as any)(this._input) as any).datepicker("hide").datepicker('destroy')
        super.destroy();
    }

    show() {
        if (this._calendarOpen) {
            // @ts-ignore
            ($ as any).datepicker.dpDiv.stop(true, true).show();
        }
    };

    hide() {
        if (this._calendarOpen) {
            // @ts-ignore
            ($ as any).datepicker.dpDiv.stop(true, true).hide();
        }
    }

    position(position: Position) {
        if (!this._calendarOpen) {
            return;
        }
        // @ts-ignore
        ($ as any).datepicker.dpDiv
            .css("top", position.top + 30)
            .css("left", position.left);
    }
}

export class YesNoSelectEditor extends BaseEditor {

    declare _input: HTMLSelectElement;

    init() {
        this._args.container.appendChild(this._input = H("select", { tabIndex: "0", class: "editor-yesno slick-editor-yesno" },
            H("option", { value: "yes" }, "Yes"),
            H("option", { value: "no" }, "No")));

        this._input.focus();

        addCompositeChangeListener(this, this._args, this._input);
    }

    loadValue(item: any) {
        this._input.value = (this._defaultValue = item[this._args.column.field]) ? "yes" : "no";
    }

    serializeValue() {
        return this._input.value === "yes";
    }

    isValueChanged() {
        return this._input.value != this._defaultValue;
    }

    validate() {
        return {
            valid: true,
            msg: null as string
        }
    }
}

export class CheckboxEditor extends BaseEditor {

    declare _input: HTMLInputElement;

    init() {
        this._input = this._args.container.appendChild(H("input", { type: "checkbox", value: "true", class: "editor-checkbox slick-editor-checkbox", hideFocus: true }));
        this._input.focus();

        addCompositeChangeListener(this, this._args, this._input);
    }

    loadValue(item: any) {
        this._defaultValue = !!item[this._args.column.field];
        this._input.checked = !!this._defaultValue;
    }

    preClick() {
        this._input.checked = !this._input.checked;
    }

    serializeValue() {
        return this._input.checked;
    }

    applyValue(item: any, state: any) {
        item[this._args.column.field] = state;
    }

    isValueChanged() {
        return this.serializeValue() !== this._defaultValue;
    }

    validate() {
        return {
            valid: true,
            msg: null as string
        }
    }
}

export class PercentCompleteEditor extends IntegerEditor {
    protected _picker: HTMLDivElement;

    init() {
        super.init();
        this._input.classList.remove('editor-text', 'slick-editor-text');
        this._input.classList.add('editor-percentcomplete', 'slick-editor-percentcomplete');

        var slider: HTMLDivElement;
        this._picker = this._args.container.appendChild(
            H("div", { class: "slick-editor-percentcomplete-picker" },
                H("div", { class: "slick-editor-percentcomplete-helper" },
                    H("div", { class: "slick-editor-percentcomplete-wrapper" },
                        H("div", { class: "slick-editor-percentcomplete-slider", ref: el => slider = el }),
                        H("div", { class: "slick-editor-percentcomplete-buttons" },
                            H("button", { "data-val": 0 }, "Not started"),
                            H("button", { "data-val": 50 }, "In Progress"),
                            H("button", { "data-val": 100 }, "Complete"))))));

        this._input.focus();
        this._input.select();

        // @ts-ignore
        (($ as any)(slider) as any).slider({
            orientation: "vertical",
            range: "min",
            value: this._defaultValue,
            slide: (_: any, ui: any) => {
                this._input.value = ui.value;
            },
            stop: () => {
                if (this._args.compositeEditorOptions)
                    triggerCompositeEditorChange(this, this._args);
            }
        });

        // @ts-ignore
        ($ as any)(this._picker).find(".slick-editor-percentcomplete-buttons button")
            .on("click", (e: any) => {
                this._input.value = (e.target as HTMLButtonElement).dataset.val;
                // @ts-ignore               
                (($ as any)(slider) as any).slider("value", (e.target as HTMLButtonElement).dataset.val);
            });
    }

    destroy() {
        super.destroy();
        this._picker.remove();
    }
}

/*
* An example of a "detached" editor.
* The UI is added onto document BODY and .position(), .show() and .hide() are implemented.
* KeyDown events are also handled to provide handling for Tab, Shift-Tab, Esc and Ctrl-Enter.
*/
export class LongTextEditor extends BaseEditor {

    declare _input: HTMLTextAreaElement;
    protected _container: HTMLElement;
    protected _wrapper: HTMLDivElement;

    init() {
        const isComposite = this._args.compositeEditorOptions;
        this._container = isComposite ? this._args.container : document.body;

        this._wrapper = this._container.appendChild(H("div", {
            class: "large-editor-text slick-large-editor-text",
            style: `z-index:10000; background:white; padding:5px; border:3px solid gray; border-radius:10px;${isComposite ? "position: relative; padding: 0; border: 0" : "position: absolute" }`
        },
            H("textarea", { hidefocus: true, rows: "5", style: "background:white; width:250px; height:80px; border:0; outline:0", ref: el => this._input = el })));

        if (isComposite)
            addCompositeChangeListener(this, this._args, this._input)
        else {
            this._wrapper.appendChild(H("div", { style: "text-align: right" },
                H("button", { ref: el => el.addEventListener('click', this.save.bind(this))}, "Save" ),
                H("button", { ref: el => el.addEventListener('click', this.cancel.bind(this))}, "Cancel")));

            this._input.addEventListener('keydown', this.handleKeyDown.bind(this));
            this.position(this._args.position);
        }

        this._input.focus();
        this._input.select();
    }

    handleKeyDown(e: KeyboardEvent) {
        if (e.key === "Enter" && e.ctrlKey) {
            this.save();
        } else if (e.key === "Esc" || e.key == "Escape") {
            e.preventDefault();
            this.cancel();
        } else if (e.key === "Tab" && e.shiftKey) {
            e.preventDefault();
            this._args.grid.navigatePrev();
        } else if (e.key === "Tab") {
            e.preventDefault();
            this._args.grid.navigateNext();
        } else if (e.key === "Left" || e.key === "ArrowLeft" || e.key === "Right" || e.key === "ArrowRight") {
            if (this._args.editorCellNavOnLRKeys) {
                var cursorPosition = (e.target as HTMLInputElement).selectionStart;
                var textLength = (e.target as HTMLInputElement).value.length;
                if ((e.key === "Left" || e.key === "ArrowLeft") && cursorPosition === 0) {
                    this._args.grid.navigatePrev();
                }
                if ((e.key === "Right" || e.key === "ArrowRight") && cursorPosition >= textLength - 1) {
                    this._args.grid.navigateNext();
                }
            }
        }
    }

    save() {
        this._args.commitChanges();
    };

    cancel() {
        this._input.value = this._defaultValue;
        this._args.cancelChanges();
    }

    hide() {
        this._wrapper.style.display = "none";
    }

    show() {
        this._wrapper.style.display = null;
    }

    position(position: Position) {
        this._wrapper.style.top = (position.top - 5) + 'px';
        this._wrapper.style.left = (position.left - 5) + 'px';
    }

    destroy() {
        this._wrapper.remove();
    }
}

function addCompositeChangeListener(editor: Editor, args: EditorOptions, input: HTMLElement) {
    if (!args.compositeEditorOptions)
        return;

    // don't show Save/Cancel when it's a Composite Editor and also trigger a onCompositeEditorChange event when input changes
    input.addEventListener("change", () => {
        triggerCompositeEditorChange(editor, args);
    });
}

function triggerCompositeEditorChange(editor: Editor, args: EditorOptions) {
    var activeCell = args.grid.getActiveCell();

    // when valid, we'll also apply the new value to the dataContext item object
    if (editor.validate().valid)
        editor.applyValue(args.item, editor.serializeValue());
    editor.applyValue(args.compositeEditorOptions.formValues, editor.serializeValue());
    args.grid.onCompositeEditorChange.notify({
        row: activeCell.row,
        cell: activeCell.cell,
        item: args.item,
        column: args.column,
        formValues: args.compositeEditorOptions.formValues
    });
}

/*
* Depending on the value of Grid option 'editorCellNavOnLRKeys', us
* Navigate to the cell on the left if the cursor is at the beginning of the input string
* and to the right cell if it's at the end. Otherwise, move the cursor within the text
*/
function handleKeydownLRNav(e: KeyboardEvent): void {
    var cursorPosition = this.selectionStart;
    var textLength = this.value.length;
    if (((e.key === "Left" || e.key === "ArrowLeft") && cursorPosition > 0) ||
        (e.key === "Right" || e.key === "ArrowRight") && cursorPosition < textLength - 1) {
        e.stopImmediatePropagation();
    }
}

function handleKeydownLRNoNav(e: KeyboardEvent) {
    if (e.key === "Left" || e.key === "ArrowLeft" || e.key === "Right" || e.key === "ArrowRight") {
        e.stopImmediatePropagation();
    }
}
