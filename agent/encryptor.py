class Encryptor:

    def __init__(self, key = "nmrd"):

        self.key = key
        self.key_length = len(self.key)

    def encrypt_decrypt(self, data: str) -> str:
        result = []
        for i, char in enumerate(data):
            key_char = self.key[i % self.key_length]
            encrypted_char_code = ord(char) ^ ord(key_char)
            result.append(chr(encrypted_char_code))
        return ''.join(result)


# # דוגמה לשימוש במחלקה
# enc = Encryptor()
# # הצפנה
# encrypted_data = enc.encrypt_decrypt(original_data)
# # פענוח
# decrypted_data = enc.encrypt_decrypt(encrypted_data)

