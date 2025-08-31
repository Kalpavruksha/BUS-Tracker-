export const validateUSN = (usn) => {
  // Check if USN matches the pattern 2KE22CS001 to 2KE22CS180 or 2KE23CS400 to 2KE23CS421
  const regex = /^2KE(22CS(0[0-9][0-9]|1[0-7][0-9]|180)|23CS(4[0-1][0-9]|420|421)|22CS060)$/;
  
  if (!regex.test(usn)) {
    return {
      isValid: false,
      message: 'Invalid USN format. Must be between 2KE22CS001-2KE22CS180 or 2KE23CS400-2KE23CS421'
    };
  }
  
  return {
    isValid: true,
    message: 'Valid USN'
  };
}; 