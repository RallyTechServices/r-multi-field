// custom Vtype for vtype:'htmlChars'
var htmlCharsTest = /^[^\|<>]*$/;
Ext.apply(Ext.form.field.VTypes, {
    //  vtype validation function
    htmlChars: function(val, field) {
        return htmlCharsTest.test(val);
    },
    // vtype Text property: The error text to display when the validation function returns false
    htmlCharsText: 'Cannot contain |, < or > characters.'
});


Ext.define('Rally.techservices.TSMultiPicker', {
    extend: 'Rally.ui.picker.MultiObjectPicker',
    alias: 'widget.tsmultipicker',
    
    config: {
        
        /**
         * @cfg {String}
         * The key of a value in a selected record. That value is used when saving the record's selected state.
         */
        selectionKey: 'Name',

        /**
         * @cfg {String}
         * The key of the value in a record.
         */
        recordKey: 'Value',
        /**
         * 
         * @type {String}
         * The separator for joining the array of choices
         */
        separator: ','
        
        
    },

    constructor: function(config) {
        this.mergeConfig(config);
        this.callParent([this.config]);
    },

    initEvents: function() {
        //console.log('initEvents',arguments);
        this.callParent(arguments);
        
        
        this.on('afteralignpicker', this._selectCheckboxes, this);
        if (this.collapseOnBlur) {
            this.on('blur', this.collapse, this);
        }
        this.mon(this.inputEl, 'keyup', this.validate, this);

        if (this.alwaysExpanded || this.autoExpand) {
            if (this.rendered) {
                this.expand();
            } else {
                this.on('afterrender', this.expand, this);
            }
        }


    },

    setValue: function(values) {

        this.selectedValues.clear(); 
        if(Ext.isArray(values)) {
            Ext.each(values, function(value) {
                this.selectedValues.add(value.get(this.selectionKey), value);
            }, this);
        } else {
            var items = Ext.Array.merge((values || '').split(','), this.alwaysSelectedValues);
            Ext.Array.each(items, function(key) {
                var regex = new RegExp('^' + key.replace(/([\.\\\+\*\?\[\^\]\$\(\)])/g, '\\$1') + '$');
                var value = this.store && this.store.findRecord(this.selectionKey, regex);
                if(value) {
                    this.selectedValues.add(key, value);
                }
            }, this);
        }

        if (this.store){
            this.groupRecords(this._getRecordValue());
        }
        if(this.isExpanded) {
            this._onListRefresh();
            this.groupRecords(this.getValue());
        }
    },

    // convert the records into a separated string
    getValue: function() {
        var records = this._getRecordValue();
        var value = [];
        
        Ext.Array.each(records,function(record){
            if (record) {
          //      value.push(record.get(this.recordKey));ex
                value.push(record.get(this.selectionKey));
            }
        },this);
        return value.join(this.separator) ;
    },

    getSubmitData: function() {

        var fieldNames = [];
        this.selectedValues.eachKey(function(key, value) {
            if(value.get('name')) {
                fieldNames.push(value.get('name'));
            }
        });

        var ret = {};
        ret[this.name] = fieldNames;

        return ret;
    },

    /**
     * @private
     */
    createPicker: function() {
        //console.log('createPicker');
        this.picker = Ext.create(this.pickerType, this.pickerCfg);
        this.picker.add(this._createList());
        return this.picker;
    },

    /**
     * @private
     */
    alignPicker: function() {
        //console.log('alignPicker');
        var heightAbove = this.getPosition()[1] - Ext.getBody().getScroll().top,
            heightBelow = Ext.Element.getViewHeight() - heightAbove - this.getHeight(),
            space = Math.max(heightAbove, heightBelow);

        this._alignPickerAndList();

        if (this.pickerCfg.height) {
            this.picker.setHeight(this.pickerCfg.height);
            this.list.setHeight(this.pickerCfg.height);
            this.doAlign();
        } else if (this.picker.getHeight() > space) {
            var maxPickerHeight = space - 5;
            var pickerHeightChange = this.picker.getHeight() - maxPickerHeight;
            this.list.setHeight(this.list.getHeight() - pickerHeightChange);
            this.picker.setHeight(maxPickerHeight);
            this.doAlign();
        }
        this.fireEvent('afteralignpicker');
    },

    expand: function() {
        //console.log('expand');
        this.setPlaceholderText(this.loadingText);
        if (this.store) {
            Rally.ui.picker.MultiObjectPicker.superclass.expand.call(this);
            if(this.alwaysExpanded) {
                this.getPicker().zIndexManager.unregister(this.getPicker());
                this.getPicker().getEl().setStyle({
                    zIndex: 1
                });
            }
            this._resetStore();
        } else {
            this._createStoreAndExpand();
        }
    },

    onRender: function() {
        //console.log('onRender');
        this.callParent(arguments);
        if (!this.hideTrigger) {
            this.inputEl.addCls('rui-multi-object-picker-no-trigger');
        }
    },
    _getKey: function(model_name, field_name){
        model_name = model_name.replace('/','.');
        return 'rally.techservices.fieldvalues.' + model_name + '.' + field_name;
    },
    _createStoreAndExpand: function() {
        var me = this;
        Ext.define('Choice',{
            extend:'Ext.data.Model',
            fields:[
                {name:'Name',type:'string'},
                {name:'Value',type:'string'},
                {name:this.groupName,type:'string'}
            ]
        });

        var store = Ext.create('Ext.data.Store',{
            model:'Choice'
        });

        var key = this._getKey(this.config.model, this.field_name); 

        Rally.data.PreferenceManager.load({
            filterByName: key,
            success: function(prefs) {

                var values = [];
                if ( prefs && prefs[key] ) {
                    Ext.Array.each(Ext.JSON.decode(prefs[key]),function(value){
                        var key_value = value.replace(/\W+/g,"");
                        values.push({Name:value,Value:key_value});
                    });
                    store.loadData(values);
                }
                me.store = store;
                me.expand;
            }
        });
        
//        this.mon(store, 'load', function(store) {
//            console.log('---',Ext.clone(store));
//            this.store = store;
//            this.expand();
//        }, this, {single: true});
        
//        var datum = Ext.create('Choice',{Name:'A',Value:'A'});
//        console.log(datum);
//        store.loadData([{Name:'A',Value:'A'},{Name:'B',Value:'B'}]);
//        this.store = store;
//        this.expand();
        
        
    },
    
    /**
     * Retrieve the selected items as an array of records
     */
    _getRecordValue: function() {
        var me = this;
        var recordArray = [];
        //console.log('_getRecordValue',this.selectedValues);
        this.selectedValues.eachKey(function(key, value) {
              var regex = new RegExp('^' + key.replace(/([\.\\\+\*\?\[\^\]\$\(\)])/g, '\\$1') + '$');
//              var record = this.store.findRecord(this.recordKey, new RegExp('^' + value.get(this.recordKey) + '$'));
                var record = this.store.findRecord(this.selectionKey, regex);
            recordArray.push(record);
        }, this);
        return recordArray;
    },

    /**
     * Create the BoundList based on #listCfg and setup listeners to some of its events.
     */
    _createList: function() {

        var listCfg = {
            store: this.store,
            tpl: this._getListTpl()
        };
        Ext.apply(listCfg, this.listCfg);
        this.list = Ext.create(this.listType, listCfg);
        this.mon(this.list, {
            refresh: this._onListRefresh,
            itemclick: this._onListItemClick,
            scope: this
        });
        return this.list;
    },

    /**
     * Select the checkboxes for the selected records
     */
    _selectCheckboxes: function() {
        if (this.list && this.list.getSelectionModel()) {
            Ext.each(this.list.getSelectionModel().getSelection(), function(record) {

                this._selectRowCheckbox(record.get(this.recordKey));  //
            }, this);
        }
    },

    /**
     * Reset the store, such as removing any previous filters.
     */
    _resetStore: function() {
        this.store.clearFilter();
        this.store.clearGrouping();
        this.store.requester = this;

        if (this.store.getCount() < 1) {
            this.store.load({
                scope: this,
                callback: this._onStoreLoad
            });
        } else {
            this._onStoreLoad();
        }
    },

    _alignPickerAndList: function() {

        if (this.isExpanded) {
            if (this.matchFieldWidth) {

                var labelWidth = 0;
                if(!!this.fieldLabel) {
                    labelWidth = this.labelWidth + 5;
                }
                this.list.setSize(this.getWidth() - labelWidth, null);
                this.picker.setSize(this.getWidth() - labelWidth, this._getPickerHeight());
            }
            if (this.picker.isFloating()) {
                this.doAlign();
            }
        }
    },

    /**
     * Determine the height of the picker panel by adding up the heights of all its children items.
     */
    _getPickerHeight: function() {
     
        var totalHeight = 0;
        Ext.each(this.picker.items.getRange(), function(item) {
            totalHeight += item.getHeight();
        });
        return totalHeight;
    },

    /**
     * Ensure that the selected rows in the list match the internal array of selected values
     */
    _syncSelection: function() {
 
        if (this.list) {
            var selectionModel = this.list.getSelectionModel();
            selectionModel.deselectAll(true);
            var selectedInList = Ext.Array.filter(this._getRecordValue(), this._isRecordInList, this);
            selectionModel.select(selectedInList);
        }
    },
    /**
     * @param recordId the value of the record's ID, which corresponds to the row
     */
    _getOptionCheckbox: function(recordId) {
//        console.log('_getOptionCheckbox',recordId);
        var checkboxSelector = 'li.' + this.id + '.' + this._getOptionClass(recordId) + ' .rui-picker-checkbox';
        return Ext.get(Ext.DomQuery.selectNode(checkboxSelector));
    },

    /**
     * @param recordId the value of the record's ID, which corresponds to the row
     */
    _getOptionClass: function(recordId) {
        return 'rui-multi-object-picker-option-id-' + recordId.toString();
    },

    _selectRowCheckbox: function(recordId) {
//        console.log('_selectRowCheckbox',recordId);
        var checkbox = this._getOptionCheckbox(recordId);
        if (checkbox) {
            checkbox.addCls('rui-picker-cb-checked');
        }
    },

    _deselectRowCheckbox: function(recordId) {
//        console.log('_deselectRowCheckbox',recordId);
        this._getOptionCheckbox(recordId).removeCls('rui-picker-cb-checked');
    },

    _isRecordInList: function(record) {
//        console.log('_isRecordInList',record.recordKey, this.list.getNode(record));
        return this.list.getNode(record) ? true : false;
    },

    _autoExpand: function() {
//        console.log('_autoExpand');
        if (this.autoExpand && (!this.isExpanded)) {
            this.onTriggerClick();
        }
    },

    /**
     * @private
     * @return {Ext.XTemplate} the XTemplate for the list.
     */
    _getListTpl: function() {
//        console.log('_getListTpl',this.rowCls,this.disabledRowCls,this.id,this.recordKey,this.rowCheckboxCls,this.rowTextCls);
        var me = this;
        return Ext.create('Ext.XTemplate',
            '<tpl exec="this.headerRendered = false"></tpl>',
            '<ul>',
            '<tpl for=".">',
                '<tpl if="(!this.headerRendered) || (this.groupSelected !== values.groupSelected)">',
                    '<tpl exec="this.groupSelected = values.groupSelected"></tpl>',
                    '<tpl exec="this.headerRendered = true"></tpl>',
                    '<div class="rally-group-header">{groupSelected}</div>',
                '</tpl>',
                '<li class="',
                Ext.baseCSSPrefix,
                'boundlist-item ',
                this.rowCls,
                '<tpl if="this._shouldDisableSelection(values)">',
                    ' ' + this.disabledRowCls,
                 '</tpl>',
                ' ',
                this.id,
                ' rui-multi-object-picker-option-id-{',
                this.recordKey,
                '}">',
                '<div class="',
                this.rowCheckboxCls,
                '" ></div>',
                '<div class="',
                this.rowTextCls,
                '">{matchedText}</div>',
                '</li>',
            '</tpl>',
            '</ul>',
            {
                _shouldDisableSelection: function(recordData) {
                    return Ext.Array.contains(me.alwaysSelectedValues, recordData[me.selectionKey]);
                }

            }
        );
    },

    _onSelect: function(record, event) {
//        console.log('_onSelect');
        var key = record.get(this.selectionKey);
        this.selectedValues.add(key, record);
        this._syncSelection();
        this._selectRowCheckbox(record.get(this.recordKey));
        this._groupRecordsAndScroll(this._getRecordValue());
        this.fireEvent('select', this, record, this.getValue());
        this.fireEvent('selectionchange', this, this.getValue());
    },

    _onDeselect: function(record, event) {
//        console.log('_onDeselect');
        var key = record.get(this.selectionKey);
        this.selectedValues.remove(this.selectedValues.get(key));
        this._syncSelection();
        this._deselectRowCheckbox(record.get(this.recordKey));
        this._groupRecordsAndScroll(this._getRecordValue());
        this.fireEvent('deselect', this, record, this.getValue());
        this.fireEvent('selectionchange', this, this.getValue());
    },

    _clickedRowCheckbox: function(event) {
//        console.log('_clickedRowCheckbox');
        //selected the whole row and rowSelectable == true
        if (this.getRowSelectable() &&
            (Ext.get(event.getTarget()).hasCls(this.rowCls) ||
                Ext.get(event.getTarget()).hasCls(this.rowTextCls) ||
                Ext.get(event.getTarget()).hasCls(this.rowCheckboxCls))) {
            return true;
        }

        //selected just the checkbox
        if (Ext.get(event.getTarget()).hasCls(this.rowCheckboxCls)) {
            return true;
        }
        return false;
    },

    /**
     * Listener to list's itemclick event
     * @private
     */
    _onListItemClick: function(view, record, itemEl, index, event) {
//        console.log('_onListItemClick');
        if(Ext.Array.contains(this.alwaysSelectedValues, record.get(this.selectionKey))) {
            return false;
        }

        var selModel = this.list.getSelectionModel();
        if (selModel.isSelected(record)) {
            this._onDeselect(record, event);
        } else {
            this._onSelect(record, event);
        }
        return false;
    },

    _onStoreLoad: function() {
        //console.log('_onStoreLoad');
        this.removePlaceholderText();
        this.initFiltering();
        this.groupRecords(this._getRecordValue());

        if (this.originalValue) {
            this.setValue(this.originalValue);
        }

        if (this.list) {
            this.list.refresh();
        }
    },
    

    _onListRefresh: function() {
//        console.log('_onListRefresh');
        this._syncSelection();
        this.alignPicker();
    },

    _groupRecordsAndScroll: function(selectedRecords) {
//        console.log('_groupRecordsAndScroll',selectedRecords);
        var scroll = 0;
        if(this.maintainScrollPosition) {
            scroll = this.list.listEl.getScroll();
        }

        this.groupRecords(selectedRecords);

        if(this.maintainScrollPosition) {
            Ext.Object.each(scroll, function(key){
                this.list.listEl.scrollTo(key, scroll[key]);
            }, this);
        }
    },
    groupRecords: function(selectedRecords) {

        if (typeof(selectedRecords) == "string"){
            return;
        }        
        var selectedText = this.selectedTextLabel,
            availableText = this.availableTextLabel,
            attr = this.groupName,
            store = this.store;
        
        // Mark selected items with attribute, then group by attribute.
        store.suspendEvents(true);
        store.each(function(record) {
           record.set(attr, availableText);
        });

        Ext.each(selectedRecords, function(record) {
                record.set(attr, selectedText);
        });

        store.group([{
            property: attr,
            direction: 'DESC'
        }]);
        this._removeGroupSorter();
        store.resumeEvents();
    }
});