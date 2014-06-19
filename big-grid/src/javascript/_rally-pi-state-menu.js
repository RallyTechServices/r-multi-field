(function() {
    
    var Ext = window.Ext4 || window.Ext;

    Ext.define('Rally.ui.menu.bulk.PortfolioItemState', {
        extend: 'Rally.ui.menu.bulk.MenuItem',
        alias: 'widget.rallyrecordmenuitembulkportfolioitemstate',

        clientMetrics: [{
            beginMethod: '_onSave',
            endMethod: 'onSuccess',
            description: 'bulk action complete'
        }],
        config: {
            text: 'Change State...',
            handler: function() {this._changeState();},
            predicate: function(records){
                return _.every(records, function(record) {
                    return record.get('_type').match(/^portfolioitem/);
                });
            }
        },
        field: 'State',
        fieldLabel: 'State:',
        title: 'Bulk Update Portfolio Item State',
        
        _getModel: function(){
            if (this.records[0] && this.records[0].get('_type')){
                return this.records[0].get('_type');
            }
            return null;
        },
        _onSave: function(){
           var state_value =this.state_dialog.down('rallyfieldvaluecombobox').getValue(); 
           var successfulRecords = Ext.Array.clone(this.records);
           
           Rally.data.BulkRecordUpdater.updateRecords({
                records: this.records,
                propertiesToUpdate: {
                    State: state_value 
                },
                success: function(readOnlyRecords){
                    //all updates finished, except for given read only records
                    Ext.Array.each(successfulRecords, function(record){
                        if (Ext.Array.contains(readOnlyRecords, record)){
                            successfulRecords.pop(record);
                        };
                    });
                    this.onSuccess(successfulRecords,readOnlyRecords);
                },
                scope: this
            });
            this.state_dialog.close();
        },
        _onCancel: function(){
            this.state_dialog.close();
        },
        _changeState: function(){
            var model = this._getModel();  
            if (!model){
                this.onSuccess([],this.records,"Model not found or selected items are not valid for this operation");
                return; 
            }
            this.state_dialog = Ext.create('Rally.ui.dialog.Dialog', {
                modal: true,
                title: this.title,
                width: 300,
                scope: this,
                items:[
                    {
                        xtype: 'rallyfieldvaluecombobox',
                        model: model,
                        allowNoEntry: false,
                        editable: false,
                        field: 'State',
                        displayField: 'Name',
                        valueField: '_ref',
                        fieldLabel:  this.fieldLabel,
                        padding: 10,
                        labelAlign: 'right'
                    },{
                        scope: this,
                        xtype: 'rallybutton',
                        text: 'Save',
                        handler: function(){
                            this._onSave();
                        },
                        margin: 10
                    },{
                        scope: this,
                        xtype: 'rallybutton',
                        text: 'Cancel',
                        handler: function(){
                            this._onCancel();
                        },
                        margin: 10
                        
                    }]
                
            });
           this.state_dialog.show();
        },
        onSuccess: function (successfulRecords, unsuccessfulRecords, errorMessage) {
            var message = successfulRecords.length + ' records updated successfully';
            if(successfulRecords.length && unsuccessfulRecords.length == 0) {
                Rally.ui.notify.Notifier.show({ message: message + '.' });
            } else {
                Rally.ui.notify.Notifier.showWarning({
                    message: [message, ', and ', unsuccessfulRecords.length, ' failed.', errorMessage].join(' ')
                });
            }
            Ext.callback(this.onActionComplete, null, [successfulRecords, unsuccessfulRecords]);
        }
  
        
   });
})();
