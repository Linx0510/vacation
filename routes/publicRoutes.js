const express = require('express');
const router = express.Router();
const PageController = require('../controllers/pageController');

router.get('/', PageController.getIndex);
router.get('/about', PageController.getAbout);
router.get('/contacts', PageController.getContacts);
router.get('/help', PageController.getHelp);
router.get('/privacy', PageController.getPrivacy);
router.get('/personal-data', PageController.getPersonalData);
router.get('/terms', PageController.getTerms);
router.get('/marketing-consent', PageController.getMarketingConsent);
router.get('/offer', PageController.getOffer);
router.get('/partners', PageController.getPartners);
router.get('/become-organizer', PageController.getBecomeOrganizer);
router.post('/contact/send', PageController.sendContactForm);

module.exports = router;
