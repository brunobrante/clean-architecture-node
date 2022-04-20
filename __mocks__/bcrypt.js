module.exports = {
	isValid: true,
	hash: '',
	value: '',
	async compare(value, hash) {
		this.value = value
		this.hash = hash
		return this.isValid
	}
}