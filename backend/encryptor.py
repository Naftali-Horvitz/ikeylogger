class Encryptor:

    def __init__(self, key = "nmrd"):
        self.key = key
        self.key_length = len(self.key)

    def encrypt_dict(self, data_dict: dict):

        encrypted_dict = {}

        for k, v in data_dict.items():
            encrypted_k = self.encrypt_decrypt(str(k))
            if isinstance(v, dict):
                # אם הערך הוא מפתח, קוראים שוב לפונקציה באופן רקורסיבי
                encrypted_v = self.encrypt_dict(v)
            else:
                encrypted_v = self.encrypt_decrypt(str(v))
            encrypted_dict[encrypted_k] = encrypted_v

        return encrypted_dict

    def encrypt_decrypt(self, data: str) -> str:
        result = []
        for i, char in enumerate(data):
            key_char = self.key[i % self.key_length]
            encrypted_char_code = ord(char) ^ ord(key_char)
            result.append(chr(encrypted_char_code))
        return ''.join(result)


if __name__ == "__main__":
    encryptor = Encryptor()
    x=encryptor.encrypt_dict({
    "*(!/:\"\"I:_:-<XA": {
        "\\]@QC]KI^\\": {
            "_THU\\": {
                "ֱִֹ֖և": "\\"
            }
        }
    }
})
    print(x)
