const LoginRouter = require('./login-router');
const { UnauthorizedError, ServerError } = require('../errors');
const { MissingParamError, InvalidParamError } = require('../../utils/errors');


const makeSut = () => {
	const authUseCaseSpy = makeAuthUseCaseSpy();
	const emailValidatorSpy = makeEmailValidator();
	const sut = new LoginRouter({ authUseCase: authUseCaseSpy, emailValidator: emailValidatorSpy });
	return {
		sut,
		authUseCaseSpy,
		emailValidatorSpy
	};
}

const makeAuthUseCaseSpy = () => {
	// Nao e uma classe de producao, e uma classe mockada
	// Somente para testar o login router
	class AuthUseCaseSpy {
		async auth(email, password) {
			this.email = email
			this.password = password
			return this.accessToken
		}
	};

	const authUseCaseSpy = new AuthUseCaseSpy();
	// Estamos mockando um valor valido default para o accessToken para testar
	authUseCaseSpy.accessToken = 'valid_token';
	return authUseCaseSpy;
}

const makeAuthUseCaseWithError = () => {
	class AuthUseCaseSpy {
		async auth() {
			throw new Error()
		}
	};

	return new AuthUseCaseSpy();
}

const makeEmailValidator = () => {
	class EmailValidatorSpy {
		isValid(email) {
			this.email = email
			return this.isEmailValid
		}
	}
	const emailValidatorSpy = new EmailValidatorSpy()
	emailValidatorSpy.isEmailValid = true
	return emailValidatorSpy;
}


const makeEmailValidatorWithError = () => {
	class EmailValidatorSpy {
		isValid() {
			throw new Error()
		}
	}
	return new EmailValidatorSpy()
}

describe('Login Router', () => {

	test('Should return 400 if no email is provided', async () => {
		const { sut } = makeSut();
		const httpRequest = {
			body: {
				password: 'any_password'
			}
		};
		const httpResponse = await sut.route(httpRequest);
		expect(httpResponse.statusCode).toBe(400);
		expect(httpResponse.body).toEqual(new MissingParamError('email'));
	});

	test('Should return 400 if no password is provided', async () => {
		const { sut } = makeSut();
		const httpRequest = {
			body: {
				email: 'any_email@mail.com'
			}
		};
		const httpResponse = await sut.route(httpRequest);
		expect(httpResponse.statusCode).toBe(400);
		expect(httpResponse.body).toEqual(new MissingParamError('password'));
	});

	test('Should return 500 if no httpRequest is provided', async () => {
		const { sut } = makeSut();
		const httpResponse = await sut.route();
		expect(httpResponse.statusCode).toBe(500);
		expect(httpResponse.body).toEqual(new ServerError());
	});

	test('Should return 500 if httpRequest has no body', async () => {
		const { sut } = makeSut();
		const httpRequest = {};
		const httpResponse = await sut.route(httpRequest);
		expect(httpResponse.statusCode).toBe(500);
		expect(httpResponse.body).toEqual(new ServerError());
	});

	test('Should call AuthUseCase with correct params', async () => {
		const { sut, authUseCaseSpy } = makeSut();
		const httpRequest = {
			body: {
				email: 'any_email@mail.com',
				password: 'any_password'
			}
		};
		await sut.route(httpRequest);
		expect(authUseCaseSpy.email).toBe(httpRequest.body.email);
		expect(authUseCaseSpy.password).toBe(httpRequest.body.password);
	});

	test('Should return 401 when invalid credentials are provided', async () => {
		const { sut, authUseCaseSpy } = makeSut();
		// Estamos mockando um valor invalido para o accessToken para testar
		authUseCaseSpy.accessToken = null;
		const httpRequest = {
			body: {
				email: 'invalid_email@mail.com',
				password: 'invalid_password'
			}
		};
		const httpResponse = await sut.route(httpRequest);
		expect(httpResponse.statusCode).toBe(401);
		expect(httpResponse.body).toEqual(new UnauthorizedError());
	});

	test('Should return 200 when valid credentials are provided', async () => {
		const { sut, authUseCaseSpy } = makeSut();
		const httpRequest = {
			body: {
				email: 'valid_email@mail.com',
				password: 'valid_password'
			}
		};
		const httpResponse = await sut.route(httpRequest);
		expect(httpResponse.statusCode).toBe(200);
		expect(httpResponse.body.accessToken).toEqual(authUseCaseSpy.accessToken)
	});


	test('Should return 400 if an invalid email is provided', async () => {
		const { sut, emailValidatorSpy } = makeSut();
		emailValidatorSpy.isEmailValid = false;
		const httpRequest = {
			body: {
				email: 'invalid_email@mail.com',
				password: 'any_password'
			}
		};
		const httpResponse = await sut.route(httpRequest);
		expect(httpResponse.statusCode).toBe(400);
		expect(httpResponse.body).toEqual(new InvalidParamError('email'));
	});


	test('Should call EmailValidator with correct params', async () => {
		const { sut, emailValidatorSpy } = makeSut();
		const httpRequest = {
			body: {
				email: 'any_email@mail.com',
				password: 'any_password'
			}
		};
		await sut.route(httpRequest);
		expect(emailValidatorSpy.email).toBe(httpRequest.body.email);
	});


	test('Should throw if invalid dependency are provided', async () => {
		const suts = [].concat(
			new LoginRouter(),
			new LoginRouter({}),
			new LoginRouter({
				authUseCase: {},
			}),
			new LoginRouter({
				authUseCase: makeAuthUseCaseSpy(),
				emailValidator: null,
			}),
			new LoginRouter({
				authUseCase: makeAuthUseCaseSpy(),
				emailValidator: {},
			}),
		)
		for (const sut of suts) {
			const httpRequest = {
				body: {
					email: 'any_email@mail.com',
					password: 'any_password'
				}
			};
			const httpResponse = await sut.route(httpRequest);
			expect(httpResponse.statusCode).toBe(500);
			expect(httpResponse.body).toEqual(new ServerError());
		}
	})


	test('Should throw if any dependency throws', async () => {
		const suts = [].concat(
			new LoginRouter({
				authUseCase: makeAuthUseCaseWithError()
			}),
			new LoginRouter({
				authUseCase: makeAuthUseCaseSpy(),
				emailValidator: makeEmailValidatorWithError(),
			}),
		)
		for (const sut of suts) {
			const httpRequest = {
				body: {
					email: 'invalid_email@mail.com',
					password: 'invalid_password'
				}
			};
			const httpResponse = await sut.route(httpRequest);
			expect(httpResponse.statusCode).toBe(500);
		}
	})
})