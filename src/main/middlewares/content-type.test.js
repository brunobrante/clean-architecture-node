const request = require("supertest");

describe('Content-Type Midlleware', () => {
	let app;

	beforeEach(() => {
		jest.resetModules()
		app = require('../config/app')
	});

	test("Should return json content type", async () => {
		app.get('/test_content_type', (req, res) => {
			res.send('');
		});
		await request(app).get('/test_content_type').expect('content-type', /json/);
	});

	test("Should return xml content if forced", async () => {
		app.get('/test_content_type', (req, res) => {
			res.type('xml');
			res.send('');
		});
		await request(app).get('/test_content_type').expect('content-type', /xml/);
	});
});