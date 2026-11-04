import express from 'express';
import {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress
} from '../controllers/addressController.js';
import { updateMe } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import {
  addressBodySchema,
  updateAddressBodySchema,
  addressIdParamSchema
} from '../validators/addressValidators.js';

const router = express.Router();

// All user routes require customer authentication
router.use(protect);

// Customer Profile
router.patch('/me', updateMe);

// Address Book Endpoints
router.route('/me/addresses')
  .get(getAddresses)
  .post(validateBody(addressBodySchema), addAddress);

router.route('/me/addresses/:addressId')
  .patch(validateParams(addressIdParamSchema), validateBody(updateAddressBodySchema), updateAddress)
  .delete(validateParams(addressIdParamSchema), deleteAddress);

export default router;
