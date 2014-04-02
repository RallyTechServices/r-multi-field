(function() {
    
    var Ext = window.Ext4 || window.Ext;

    Ext.define('Rally.ui.menu.bulk.Tag', {
        extend: 'Rally.ui.menu.bulk.MenuItem',
        alias: 'widget.rallyrecordmenuitembulktag',

        clientMetrics: [{
            beginMethod: '_onTagSelect',
            endMethod: 'onSuccess',
            description: 'bulk action complete'
        }],

        config: {
            text: 'Tag...',
            handler: function() {
                this._onBulkTagClicked();
            },
            predicate: function(records) {
                return _.every(records, function(record) {
                    return record.self.isArtifact();
                });
            },

            prepareRecords: function(records, selectedTags) {
                var successfulRecords = [];
                _.each(records, function(record) {
                    record.beginEdit();
                    var partialTagRefs = _.invoke(selectedTags.partial, 'get', '_ref'),
                        fullTagRefs = _.invoke(selectedTags.full, 'get', '_ref'),
                        selectedTagRefs = _.invoke(selectedTags,'get','_ref'),
                        existingTagRefs = _.pluck(record.get('Tags')._tagsNameArray, '_ref');
                        
                    // var newTagRefs = _(existingTagRefs).intersection(partialTagRefs).union(fullTagRefs).value();
                    var newTagRefs = _(existingTagRefs).union(selectedTagRefs).value();
                        
                    var newTagArray = _.map(newTagRefs, function(ref) { return {_ref: ref}; });

                    if (_.isEqual(existingTagRefs, newTagRefs)) {
                        successfulRecords.push(record);
                        record.cancelEdit();
                    } else {
                        record.set('Tags', newTagArray);
                    }
                });

                return successfulRecords;
            }
        },

        constructor: function(config) {
            this.mergeConfig(config);
            this.callParent(arguments);
        },
        saveRecords: function(records, args) {
            var me = this,
                successfulRecords = this.prepareRecords(records, args);

            if (successfulRecords.length === records.length) {
                me.onSuccess(successfulRecords, [], args);
            } else {
                
                var records_to_update = _.difference(records, successfulRecords);
                Ext.Array.each(records_to_update,function(record){
                    record.save({
                        callback: function(result, operation) {
                            if(operation.wasSuccessful()) {
                                //Great success
                            } else {
                                // problem
                            }
                        }
                    });
                });
                me.onSuccess(records_to_update, [], args, ".");


//                Ext.create('Rally.data.wsapi.batch.Store', {
//                    requester: this,
//                    data: _.difference(records, successfulRecords)
//                }).sync({
//                    callback: function(batchOptions) {
//                        var resultSet = batchOptions.operations[0].resultSet;
//                        successfulRecords = successfulRecords.concat(_.filter(records, function(record) {
//                            return _.any(resultSet.records, function(r) {
//                                return r.get('_ref') === record.get('_ref');
//                            });
//                        }));
//
//                        var unsuccessfulRecords = _.difference(records, successfulRecords);
//                        if(successfulRecords.length) {
//                            me.onSuccess(successfulRecords, unsuccessfulRecords, args, resultSet.message);
//                        } else {
//                            Rally.ui.notify.Notifier.showError({
//                                message: resultSet.message
//                            });
//                            Ext.callback(me.onActionComplete, null, [successfulRecords, unsuccessfulRecords]);
//                        }
//                    }
//                });
            }
        },
        _onBulkTagClicked: function() {
            Ext.create('Rally.technicalservices.TagDialog', {
                autoShow: true,
                records: this.records,
                title: 'BULK TAG EDIT',
                listeners: {
                    tagselect: this._onTagSelect,
                    scope: this
                }
            });
        },

        _onTagSelect: function(dialog, selectedTags) {
            if (this.onBeforeAction(this.records) === false) {
                return;
            }
            this.saveRecords(this.records, selectedTags);
        },

        /**
         * @override
         * @inheritdoc
         */
        onSuccess: function (successfulRecords, unsuccessfulRecords, selectedTags, errorMessage) {
            var message = [
                'Tags updated for',
                successfulRecords.length,
                (successfulRecords.length === 1 ? 'item' : 'items')
            ].join(' ');

            if(successfulRecords.length === this.records.length) {
                Rally.ui.notify.Notifier.show({ message: message + '.' });
            } else {
                Rally.ui.notify.Notifier.showWarning({
                    message: [message, ', but ', unsuccessfulRecords.length, ' failed: ', errorMessage].join(' ')
                });
            }
            Ext.callback(this.onActionComplete, null, [successfulRecords, unsuccessfulRecords]);
        }
    });
})();
