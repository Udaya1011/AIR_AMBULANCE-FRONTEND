export const calculateAge = (dobString: string | undefined): string | number => {
    if (!dobString) return "N/A";

    // If the string is just a number (e.g., "45"), return it as the age
    if (/^\d+$/.test(dobString)) {
        return parseInt(dobString);
    }

    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return "N/A";

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
    }

    return age;
};
