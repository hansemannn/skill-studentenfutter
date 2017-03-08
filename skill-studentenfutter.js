/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"] */
/**
 * Ask Alexa for todays canteen lunches. 
 **/

'use strict';

const https = require('https');

const Alexa = require('alexa-sdk');

const APP_ID = process.env.APP_ID;

const Categories = {
    MainDish: 'Hauptgericht',
    SideDish: 'Beilagen',  
    Dessert: 'Nachspeise'  
};

const languageStrings = {
    'en-US': {
        translation: {
            SKILL_NAME: 'Studentenfutter',
            SORRY: 'I am sorry.',
            CANTEEN_CLOSED_TODAY: 'The canteen is closed today.',
            HELP_MESSAGE: 'You can say, „Frage Studentenfutter, was es heute in der Mensa gibt“, or you can say „Stop“... How can I help you?',
            HELP_REPROMPT: 'How can I help you?',
            STOP_MESSAGE: 'Talk to you later!',
            FOR: 'for',
            AS_WELL_AS: 'as well as',
            ENJOY_YOUR_MEAL: 'Enjoy your meal!',
            TODAY_IN_THE_CANTEEN: 'Todays lunches for the canteen are',
        }
    },
    'de-DE': {
        translation: {
            SKILL_NAME: 'Studentenfutter',
            SORRY: 'Es tut mir Leid.',
            CANTEEN_CLOSED_TODAY: 'Die Mensa hat heute geschlossen.',
            HELP_MESSAGE: 'Du kannst sagen, „Frage Studentenfutter, was es heute in der Mensa gibt“, oder du kannst „Beenden“ sagen... Wie kann ich dir helfen?',
            HELP_REPROMPT: 'Wie kann ich dir helfen?',
            STOP_MESSAGE: 'Auf Wiedersehen!',
            FOR: 'für',
            AS_WELL_AS: 'sowie',
            ENJOY_YOUR_MEAL: 'Guten Appetit!',
            TODAY_IN_THE_CANTEEN: 'Heute gibt es in der Mensa',
        }
    }
};

/**
 Fetches the lunches from the remote REST server.
 
 @param options The API options.
 @param cb The callback to be invoked on response.
 @param that The current context.
 */
function getLunches(options, cb, that) {
    var req = https.request(options, function(res) {
        var output = '';
        res.setEncoding('utf8');

        res.on('data', function (chunk) {
            output += chunk;
        });

        res.on('end', function() {
            cb(formatTodayLunches(JSON.parse(output), that));
        });
    });

    req.on('error', function(err) {
        cb(that.t('SORRY') + ' ' + that.t('CANTEEN_CLOSED_TODAY'));
    });

    req.end();
}

/**
 Formats the todays lunches to a single phrase of main lunches or returns
 an empty phrase if no lunches are available today.
 
 @param json The JSON.parse'd JavaScript object containing all lunches for today.
 @return The formatted lunches.
 */
function formatTodayLunches(json, that) {
    var mainLunches = [];
    var spokenPartials = [];
    var spokenString = null;
        
    for (var i = 0; i < json.length; i++) {
        var lunch = json[i];
        if (lunch.category == Categories.MainDish) {
            mainLunches.push(lunch);
        }
    }
    
    if (mainLunches.length === 0) {
        return that.t('SORRY') + ' ' + that.t('CANTEEN_CLOSED_TODAY');
    }
    
    for (var j = 0; j < mainLunches.length; j++) {
        var mainLunch = mainLunches[j];
        spokenPartials.push(mainLunch.name + ' ' + that.t('FOR') + ' ' + mainLunch.priceStudent);
    }
    
    spokenString = that.t('TODAY_IN_THE_CANTEEN') + ' ';
    
    for (var k = 0; k < spokenPartials.length; k++) {
        var spokenPartial = spokenPartials[k];
        
        if (k != spokenPartials.length - 1) {
            spokenString += spokenPartial + ', ';
        } else {
            spokenString += ' ' + that.t('AS_WELL_AS') + ' ' + spokenPartial + '. ';
            spokenString += that.t('ENJOY_YOUR_MEAL');
        }
    }    
    
    return spokenString;
}

const handlers = {
    'LaunchRequest': function () {
        this.emit('GetLunches');
    },
    'TodaysLunchIntent': function () {
        this.emit('GetLunches');
    },
    'GetLunches': function () {
        const that = this;
        
        getLunches({
	    host: 'api.studentenfutter-os.de',
	    path: '/lunches/today',
	    method: 'GET',
	    headers: {
	        'Authorization': process.env.AUTH_STRATEGY
	    }
	}, function(text) {			
	    that.emit(':tell', text);
	}, this);
    },
    'AMAZON.HelpIntent': function () {
        const speechOutput = this.t('HELP_MESSAGE');
        const reprompt = this.t('HELP_MESSAGE');
        
        console.log('Help requested!');

        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        console.log('Intent cancelled!');
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
    'AMAZON.StopIntent': function () {
        console.log('Intent stopped!');
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
    'SessionEndedRequest': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
};

exports.handler = (event, context) => {
    const alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);
    
    alexa.execute();
};
