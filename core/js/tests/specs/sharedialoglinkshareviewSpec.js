/**
 * ownCloud
 *
 * @author Vincent Petry
 * @copyright 2017 Vincent Petry <pvince81@owncloud.com>
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU AFFERO GENERAL PUBLIC LICENSE
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU AFFERO GENERAL PUBLIC LICENSE for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with this library.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

describe('OC.Share.ShareDialogLinkShareView', function() {
	var itemModel;
	var fileInfoModel;
	var configModel;
	var tooltipStub;
	var model;
	var view;

	var PASSWORD_PLACEHOLDER_STARS = '**********';
	var PASSWORD_PLACEHOLDER_MESSAGE = 'Choose a password for the public link';

	beforeEach(function() {
		configModel = new OC.Share.ShareConfigModel();
		fileInfoModel = new OCA.Files.FileInfoModel({
			id: 123,
			name: 'shared_folder',
			path: '/subdir',
			size: 100,
			mimetype: 'httpd/unix-directory',
			permissions: 31,
			sharePermissions: 31
		});
		itemModel = new OC.Share.ShareItemModel({
			itemType: 'folder',
			itemSource: 123,
			permissions: 31
		}, {
			configModel: configModel,
			fileInfoModel: fileInfoModel
		});

		tooltipStub = sinon.stub($.fn, 'tooltip');
		/* jshint camelcase: false */
		model = new OC.Share.ShareModel({
			id: 1,
			name: 'first link',
			token: 'tehtokenz',
			shareType: OC.Share.SHARE_TYPE_LINK,
			itemType: 'folder',
			stime: 1489657516,
			permissions: OC.PERMISSION_READ
		});

		view = new OC.Share.ShareDialogLinkShareView({
			model: model,
			itemModel: itemModel
		});
		view.render();

		// attach to DOM because some events would not fire otherwise...
		$('#testArea').append(view.$el);
	});

	afterEach(function() {
		tooltipStub.restore();
		view.remove();
	});

	describe('popup behavior', function() {
		var $dialog;
		var popupStub;
		var popupDeferred;

		beforeEach(function() {
			$dialog = $('<div class="oc-dialog"><div class="oc-dialog-content"></div></div>');
			$('#testArea').append($dialog);
			popupDeferred = $.Deferred();
			popupStub = sinon.stub(OC.dialogs, 'message').returns(popupDeferred.promise());

			// this trigger view rendering that injects itself into the generic dialog
			popupDeferred.resolve();
		});
		afterEach(function() {
			popupStub.restore();
			$dialog.remove();
		});

		it('appears as popup when calling show()', function() {
			view.show();
			expect(popupStub.calledOnce).toEqual(true);
			expect(popupStub.getCall(0).args[0]).toEqual('');
			expect($dialog.find('.shareDialogLinkShare').length).toEqual(1);
		});
		it('shows edit title for existing model', function() {
			view.show();
			expect(popupStub.getCall(0).args[1]).toContain('Edit');
		});
		it('shows create title for new model', function() {
			model.unset('id');
			view.show();
			expect(popupStub.getCall(0).args[1]).toContain('Create');
		});
		it('shows remove-password-button if password is present', function() {
			model.set({ encryptedPassword: 'set'});
			view.show();
			expect(JSON.stringify(popupStub.getCall(0).args[3])).toContain('Remove password');
		});
		it('doesn\'t show remove-password-button if password is absent', function() {
			view.show();
			expect(JSON.stringify(popupStub.getCall(0).args[3])).not.toContain('Remove password');
		});
	});

	describe('rendering', function() {
		var publicUploadConfigStub;

		beforeEach(function() {
			publicUploadConfigStub = sinon.stub(configModel, 'isPublicUploadEnabled');
		});
		afterEach(function() {
			publicUploadConfigStub.restore();
		});
		it('renders fields populated with model values', function() {
			publicUploadConfigStub.returns(true);
			view.render();
			expect(view.$('[name=linkName]').val()).toEqual('first link');
			expect(view.$('.publicUploadCheckbox').prop('checked')).toEqual(false);
			expect(view.$('.linkPassText').val()).toEqual('');
			expect(view.$('.expirationDate').val()).toEqual('');

			model.set({
				password: 'set',
				expireDate: '2017-10-12',
				permissions: OC.PERMISSION_ALL
			});
			view.render();

			expect(view.$('.publicUploadCheckbox').prop('checked')).toEqual(true);
			expect(view.$('.linkPassText').val()).toEqual('');
			expect(view.$('.expirationDate').val()).toEqual('12-10-2017');
		});
		describe('email field', function() {
			var isMailEnabledStub;
			beforeEach(function() {
				isMailEnabledStub = sinon.stub(configModel, 'isMailPublicNotificationEnabled');
			});
			afterEach(function() {
				isMailEnabledStub.restore();
			});
			it('renders email field for new shares', function() {
				isMailEnabledStub.returns(true);
				model.unset('id');
				view.render();
				expect(view.$('.mailView input').length).toEqual(1);
			});
			it('renders email field for existing shares', function() {
				isMailEnabledStub.returns(true);
				view.render();
				expect(view.$('.mailView input').length).toEqual(1);
			});
			it('does not render email field when disallowed globally', function() {
				isMailEnabledStub.returns(false);
				model.unset('id');
				view.render();
				expect(view.$('.mailView input').length).toEqual(0);
			});
		});
		describe('public upload', function() {
			it('does not render public upload checkbox for files', function() {
				publicUploadConfigStub.returns(true);
				itemModel.set('itemType', 'file');
				view.render();
				expect(view.$('.publicUploadCheckbox').length).toEqual(0);
				expect(view.$('.showListingCheckbox').length).toEqual(0);
			});
			it('does not render public upload checkbox when permission missing', function() {
				publicUploadConfigStub.returns(true);
				itemModel.set({
					permissions: OC.PERMISSION_READ
				});
				view.render();
				expect(view.$('.publicUploadCheckbox').length).toEqual(0);
				expect(view.$('.showListingCheckbox').length).toEqual(0);
			});
			it('does not render public upload checkbox when disabled globally', function() {
				publicUploadConfigStub.returns(false);
				itemModel.set({
					permissions: OC.PERMISSION_READ
				});
				view.render();
				expect(view.$('.publicUploadCheckbox').length).toEqual(0);
				expect(view.$('.showListingCheckbox').length).toEqual(0);
			});
			it('renders listing checkbox when public upload is allowed globally', function() {
				publicUploadConfigStub.returns(true);
				model.set({
					permissions: OC.PERMISSION_READ | OC.PERMISSION_CREATE
				});
				view.render();
				expect(view.$('.showListingCheckbox').length).toEqual(1);
				expect(view.$('.showListingCheckbox').is(':checked')).toEqual(true);
				expect(view.$('.showListingCheckbox').is(':disabled')).toEqual(false);
			});
			it('renders listing checkbox disabled when public upload is disallowed by user', function() {
				publicUploadConfigStub.returns(true);
				model.set({
					permissions: OC.PERMISSION_READ
				});
				view.render();
				expect(view.$('.showListingCheckbox').length).toEqual(1);
				expect(view.$('.showListingCheckbox').is(':checked')).toEqual(true);
				expect(view.$('.showListingCheckbox').is(':disabled')).toEqual(true);
			});
			it('disables listing checkbox when ticking public upload', function() {
				publicUploadConfigStub.returns(true);
				model.set({
					permissions: OC.PERMISSION_CREATE
				});
				view.render();

				expect(view.$('.showListingCheckbox').length).toEqual(1);
				expect(view.$('.showListingCheckbox').is(':checked')).toEqual(false);
				expect(view.$('.showListingCheckbox').is(':disabled')).toEqual(false);

				expect(view.$('.publicUploadCheckbox').length).toEqual(1);
				expect(view.$('.publicUploadCheckbox').is(':checked')).toEqual(true);
				view.$('.publicUploadCheckbox').trigger(new $.Event('click'));
				expect(view.$('.publicUploadCheckbox').is(':checked')).toEqual(false);
				expect(view.$('.showListingCheckbox').is(':checked')).toEqual(true);
				expect(view.$('.showListingCheckbox').is(':disabled')).toEqual(true);
			});
		});
		describe('password logic', function() {
			it('renders empty field if no password set', function() {
				expect(view.$('.linkPassText').val()).toEqual('');
				expect(view.$('.linkPassText').attr('placeholder')).toEqual(PASSWORD_PLACEHOLDER_MESSAGE);
			});
			it('renders empty field with star placeholder if password set', function() {
				model.set('encryptedPassword', 'foo');
				view.render();
				expect(view.$('.linkPassText').val()).toEqual('');
				expect(view.$('.linkPassText').attr('placeholder')).toEqual(PASSWORD_PLACEHOLDER_STARS);
			});
			it('renders required indicator when password is enforced', function() {
				configModel.set('enforcePasswordForPublicLink', true);
				view.render();
				expect(view.$('.linkPass .required-indicator').length).toEqual(1);
			});
			it('does not render required indicator when password not enforced', function() {
				configModel.set('enforcePasswordForPublicLink', false);
				view.render();
				expect(view.$('.linkPass .required-indicator').length).toEqual(0);
			});
		});
	});

	describe('saving', function() {
		var saveStub;
		var sendMailStub;
		var sendMailDeferred;
		var isMailEnabledStub;

		beforeEach(function() {
			saveStub = sinon.stub(OC.Share.ShareModel.prototype, 'save');
			sendMailDeferred = $.Deferred();
			sendMailStub = sinon.stub(OC.Share.ShareDialogMailView.prototype, 'sendEmails').returns(sendMailDeferred);
			isMailEnabledStub = sinon.stub(configModel, 'isMailPublicNotificationEnabled').returns(true);
		});

		afterEach(function() {
			saveStub.restore();
			sendMailStub.restore();
			isMailEnabledStub.restore();
			sendMailDeferred = null;
		});

		it('reads values from the fields and saves', function() {
			view.$('.linkPassText').val('newpassword');
			view._save();
			expect(saveStub.calledOnce).toEqual(true);
			expect(saveStub.getCall(0).args[0]).toEqual({
				name: 'first link',
				expireDate: '',
				password: 'newpassword',
				permissions: OC.PERMISSION_READ,
				shareType: OC.Share.SHARE_TYPE_LINK
			});
		});
		it('does not send the password if unchanged', function() {
			model.unset('password');
			model.set('encryptedPassword', 'something');
			view.$('.linkPassText').val('');
			view._save();
			expect(saveStub.calledOnce).toEqual(true);
			expect(saveStub.getCall(0).args[0]).toEqual({
				name: 'first link',
				expireDate: '',
				permissions: OC.PERMISSION_READ,
				shareType: OC.Share.SHARE_TYPE_LINK
			});
		});
		it('sends emails after saving a new share', function() {
			model.unset('id');
			view.render();
			view._save();
			expect(sendMailStub.notCalled).toEqual(true);
			saveStub.yieldTo('success');
			expect(sendMailStub.calledOnce).toEqual(true);
		});
		it('does not send email if disabled globally', function() {
			isMailEnabledStub.returns(false);
			model.unset('id');
			view.render();
			view._save();
			expect(sendMailStub.notCalled).toEqual(true);
			saveStub.yieldTo('success');
			expect(sendMailStub.notCalled).toEqual(true);
		});
		it('does not sends emails after saving an existing share', function() {
			view._save();
			expect(sendMailStub.notCalled).toEqual(true);
			saveStub.yieldTo('success');
			expect(sendMailStub.notCalled).toEqual(true);
		});
		it('triggers "saved" event after saving', function() {
			var handler = sinon.stub();
			view.on('saved', handler);
			view._save();
			expect(handler.notCalled).toEqual(true);
			saveStub.yieldTo('success');
			expect(handler.calledOnce).toEqual(true);
			expect(handler.calledWith(model)).toEqual(true);
		});
		it('triggers "saved" event after saving and sending email', function() {
			var handler = sinon.stub();
			view.on('saved', handler);
			model.unset('id');
			view.render();
			view._save();
			expect(handler.notCalled).toEqual(true);
			saveStub.yieldTo('success');
			expect(handler.notCalled).toEqual(true);
			sendMailDeferred.resolve();
			expect(handler.calledOnce).toEqual(true);
			expect(handler.calledWith(model)).toEqual(true);
		});
		it('displays global error message when saving failed', function() {
			var handler = sinon.stub();
			view.on('saved', handler);
			view.render();
			view._save();
			expect(handler.notCalled).toEqual(true);
			saveStub.yieldTo('error', model, {
				responseJSON: {
					ocs: {
						meta: {
							message: 'Some error'
						}
					}
				}
			});
			expect(handler.notCalled).toEqual(true);
			expect(view.$('.error-message-global').hasClass('hidden')).toEqual(false);
			expect(view.$('.error-message-global').text()).toEqual('Some error');
		});
		it('displays inline error when password enforced but missing', function() {
			configModel.set('enforcePasswordForPublicLink', true);
			var handler = sinon.stub();
			view.on('saved', handler);
			view._save();
			expect(handler.notCalled).toEqual(true);

			expect(view.$('.linkPassText').next('.error-message').hasClass('hidden')).toEqual(false);
		});
		describe('permissions', function() {
			var publicUploadConfigStub;

			beforeEach(function() {
				publicUploadConfigStub = sinon.stub(configModel, 'isPublicUploadEnabled');
			});
			afterEach(function() { 
				publicUploadConfigStub.restore(); 
			});

			var dataProvider = [
				// globally enabled
				[true, true, true, OC.PERMISSION_READ | OC.PERMISSION_CREATE | OC.PERMISSION_UPDATE | OC.PERMISSION_DELETE],
				[true, true, false, OC.PERMISSION_CREATE],
				[true, false, true, OC.PERMISSION_READ],
				[true, false, false, OC.PERMISSION_READ],

				// globally disabled, permission stays regardless
				[false, false, false, OC.PERMISSION_READ],
				[false, true, false, OC.PERMISSION_READ],
				[false, true, false, OC.PERMISSION_READ],
				[false, true, true, OC.PERMISSION_READ],
			];

			function testPermissions(globalEnabled, uploadChecked, listingChecked, expectedPerms) {
				it('sets permissions to ' + expectedPerms +
					' if global enabled is ' + globalEnabled +
					' and public upload checkbox is ' + uploadChecked +
					' and listing checkbox is ' + listingChecked, function() {

					publicUploadConfigStub.returns(globalEnabled);
					view.render();

					view.$('.publicUploadCheckbox').prop('checked', uploadChecked);
					view.$('.showListingCheckbox').prop('checked', listingChecked);

					view._save();

					expect(saveStub.getCall(0).args[0].permissions)
						.toEqual(expectedPerms);
				});
			}

			_.each(dataProvider, function(testCase) {
				testPermissions.apply(null, testCase);
			});
		});
	});
});
