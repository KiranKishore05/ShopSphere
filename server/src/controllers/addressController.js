import User from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * GET /api/v1/users/me/addresses
 * Retrieve all saved addresses for the authenticated customer.
 */
export const getAddresses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('savedAddresses').lean();

    res.status(200).json({
      success: true,
      data: {
        addresses: user?.savedAddresses || []
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/users/me/addresses
 * Add a new shipping/billing address to the customer's address book.
 * Enforces the rule: exactly one default address per customer.
 */
export const addAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new AppError('User not found.', 404, 'USER_NOT_FOUND'));
    }

    const isFirstAddress = user.savedAddresses.length === 0;
    const shouldBeDefault = isFirstAddress || Boolean(req.body.isDefault);

    // If new address is default, reset isDefault on all existing addresses
    if (shouldBeDefault) {
      user.savedAddresses.forEach(addr => {
        addr.isDefault = false;
      });
    }

    const newAddressData = {
      ...req.body,
      isDefault: shouldBeDefault
    };

    user.savedAddresses.push(newAddressData);
    await user.save();

    const createdAddress = user.savedAddresses[user.savedAddresses.length - 1];

    res.status(201).json({
      success: true,
      data: {
        address: createdAddress,
        addresses: user.savedAddresses
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/users/me/addresses/:addressId
 * Update an existing address in the customer's address book.
 */
export const updateAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user._id);

    if (!user) {
      return next(new AppError('User not found.', 404, 'USER_NOT_FOUND'));
    }

    const address = user.savedAddresses.id(addressId);
    if (!address) {
      return next(new AppError('Address not found in your address book.', 404, 'ADDRESS_NOT_FOUND'));
    }

    // Handle isDefault toggle logic
    if (req.body.isDefault === true) {
      user.savedAddresses.forEach(addr => {
        addr.isDefault = addr._id.toString() === addressId;
      });
    } else if (req.body.isDefault === false && address.isDefault) {
      // If unsetting default and other addresses exist, designate another address as default
      const alternateAddress = user.savedAddresses.find(addr => addr._id.toString() !== addressId);
      if (alternateAddress) {
        address.isDefault = false;
        alternateAddress.isDefault = true;
      } else {
        // Sole address must remain default
        address.isDefault = true;
      }
    }

    // Update allowable fields
    const updatableFields = ['fullName', 'phone', 'streetAddress', 'apartment', 'city', 'state', 'postalCode', 'country'];
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        address[field] = req.body[field];
      }
    });

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        address,
        addresses: user.savedAddresses
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/users/me/addresses/:addressId
 * Delete an address from the customer's address book.
 * If default address was deleted, designate next remaining address as default.
 */
export const deleteAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user._id);

    if (!user) {
      return next(new AppError('User not found.', 404, 'USER_NOT_FOUND'));
    }

    const address = user.savedAddresses.id(addressId);
    if (!address) {
      return next(new AppError('Address not found in your address book.', 404, 'ADDRESS_NOT_FOUND'));
    }

    const wasDefault = address.isDefault;
    user.savedAddresses.pull(addressId);

    // If deleted address was default and addresses remain, make first one default
    if (wasDefault && user.savedAddresses.length > 0) {
      user.savedAddresses[0].isDefault = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        message: 'Address successfully removed from your address book.',
        addresses: user.savedAddresses
      }
    });
  } catch (error) {
    next(error);
  }
};
