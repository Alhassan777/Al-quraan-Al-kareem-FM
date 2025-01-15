import base64

def convert_file_to_base64(input_file, output_file):
    try:
        # Read the file in binary mode
        with open(input_file, "rb") as file:
            file_content = file.read()
            # Convert the content to base64
            base64_content = base64.b64encode(file_content).decode("utf-8")
        
        # Save the base64 string to the output file
        with open(output_file, "w") as output:
            output.write(base64_content)
        
        print(f"Base64 encoding complete. Saved to: {output_file}")
    except Exception as e:
        print(f"Error: {e}")

# Replace with your file paths
input_file = "telegram_session.session"
output_file = "telegram_session_base64.txt"

convert_file_to_base64(input_file, output_file)
