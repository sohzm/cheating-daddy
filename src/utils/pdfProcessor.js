const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');

// PDF processing utility for CV/resume context
class PDFProcessor {
    constructor() {
        this.uploadedCV = null;
        this.cvText = '';
        this.cvMetadata = null;
    }

    // Process uploaded PDF file
    async processPDF(filePath) {
        try {
            console.log('Processing PDF file:', filePath);
            
            // Read the PDF file
            const dataBuffer = fs.readFileSync(filePath);
            
            // Parse PDF content
            const pdfData = await pdf(dataBuffer);
            
            // Extract text and metadata
            this.cvText = pdfData.text;
            this.cvMetadata = {
                pages: pdfData.numpages,
                info: pdfData.info,
                version: pdfData.version,
                processedAt: new Date().toISOString()
            };
            
            // Store the processed CV
            this.uploadedCV = {
                filePath: filePath,
                fileName: path.basename(filePath),
                text: this.cvText,
                metadata: this.cvMetadata
            };
            
            console.log('PDF processed successfully:', {
                fileName: this.uploadedCV.fileName,
                pages: this.cvMetadata.pages,
                textLength: this.cvText.length
            });
            
            return {
                success: true,
                fileName: this.uploadedCV.fileName,
                textLength: this.cvText.length,
                pages: this.cvMetadata.pages
            };
        } catch (error) {
            console.error('Error processing PDF:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get CV context for AI prompts
    getCVContext() {
        if (!this.uploadedCV) {
            return '';
        }

        // Extract key sections from CV
        const sections = this.extractCVSections();
        
        return `
**CANDIDATE PROFILE (from uploaded CV):**
${sections.summary}

**EXPERIENCE:**
${sections.experience}

**SKILLS:**
${sections.skills}

**EDUCATION:**
${sections.education}

**PROJECTS:**
${sections.projects}

**ADDITIONAL CONTEXT:**
${sections.additional}

---
*Use this candidate profile to provide personalized interview responses that reference their specific experience, skills, and background.*
`;
    }

    // Extract structured sections from CV text
    extractCVSections() {
        if (!this.cvText) {
            return {
                summary: 'No CV uploaded',
                experience: 'No CV uploaded',
                skills: 'No CV uploaded',
                education: 'No CV uploaded',
                projects: 'No CV uploaded',
                additional: 'No CV uploaded'
            };
        }

        const text = this.cvText.toLowerCase();
        
        // Extract experience section
        const experienceKeywords = ['experience', 'work history', 'employment', 'career', 'professional experience'];
        const experienceSection = this.extractSection(text, experienceKeywords, ['education', 'skills', 'projects', 'certifications']);
        
        // Extract skills section
        const skillsKeywords = ['skills', 'technical skills', 'technologies', 'programming languages', 'tools', 'expertise'];
        const skillsSection = this.extractSection(text, skillsKeywords, ['experience', 'education', 'projects', 'certifications']);
        
        // Extract education section
        const educationKeywords = ['education', 'academic', 'degree', 'university', 'college', 'school', 'qualifications'];
        const educationSection = this.extractSection(text, educationKeywords, ['experience', 'skills', 'projects', 'certifications']);
        
        // Extract projects section
        const projectsKeywords = ['projects', 'portfolio', 'work samples', 'achievements', 'accomplishments'];
        const projectsSection = this.extractSection(text, projectsKeywords, ['experience', 'education', 'skills', 'certifications']);
        
        // Extract summary/objective
        const summaryKeywords = ['summary', 'objective', 'profile', 'about', 'overview'];
        const summarySection = this.extractSection(text, summaryKeywords, ['experience', 'education', 'skills', 'projects']);
        
        return {
            summary: summarySection || 'Professional summary not found in CV',
            experience: experienceSection || 'Work experience not found in CV',
            skills: skillsSection || 'Skills section not found in CV',
            education: educationSection || 'Education not found in CV',
            projects: projectsSection || 'Projects not found in CV',
            additional: this.extractAdditionalInfo()
        };
    }

    // Extract a specific section from CV text
    extractSection(text, keywords, stopKeywords) {
        for (const keyword of keywords) {
            const keywordIndex = text.indexOf(keyword);
            if (keywordIndex !== -1) {
                // Find the start of the section
                let sectionStart = keywordIndex;
                
                // Look for the next line or paragraph
                while (sectionStart < text.length && text[sectionStart] !== '\n') {
                    sectionStart++;
                }
                
                // Find the end of the section (next major section)
                let sectionEnd = text.length;
                for (const stopKeyword of stopKeywords) {
                    const stopIndex = text.indexOf(stopKeyword, sectionStart);
                    if (stopIndex !== -1 && stopIndex < sectionEnd) {
                        sectionEnd = stopIndex;
                    }
                }
                
                // Extract and clean the section
                let section = text.substring(sectionStart, sectionEnd).trim();
                
                // Clean up the text
                section = section.replace(/\s+/g, ' ');
                section = section.replace(/\n+/g, '\n');
                
                // Limit length to avoid overwhelming the context
                if (section.length > 1000) {
                    section = section.substring(0, 1000) + '...';
                }
                
                return section || 'Section not found';
            }
        }
        return null;
    }

    // Extract additional relevant information
    extractAdditionalInfo() {
        if (!this.cvText) return '';
        
        const additional = [];
        
        // Look for certifications
        const certKeywords = ['certification', 'certified', 'license', 'credential'];
        for (const keyword of certKeywords) {
            if (this.cvText.toLowerCase().includes(keyword)) {
                additional.push('Has relevant certifications');
                break;
            }
        }
        
        // Look for languages
        const langKeywords = ['language', 'bilingual', 'fluent', 'speaks'];
        for (const keyword of langKeywords) {
            if (this.cvText.toLowerCase().includes(keyword)) {
                additional.push('Multilingual capabilities');
                break;
            }
        }
        
        // Look for leadership experience
        const leadershipKeywords = ['lead', 'manager', 'director', 'supervisor', 'team lead'];
        for (const keyword of leadershipKeywords) {
            if (this.cvText.toLowerCase().includes(keyword)) {
                additional.push('Leadership experience');
                break;
            }
        }
        
        return additional.length > 0 ? additional.join(', ') : 'Additional information not specified';
    }

    // Get CV status
    getCVStatus() {
        return {
            hasCV: !!this.uploadedCV,
            fileName: this.uploadedCV?.fileName || null,
            textLength: this.cvText?.length || 0,
            pages: this.cvMetadata?.pages || 0,
            processedAt: this.cvMetadata?.processedAt || null
        };
    }

    // Clear CV data
    clearCV() {
        this.uploadedCV = null;
        this.cvText = '';
        this.cvMetadata = null;
        console.log('CV data cleared');
    }
}

// Export singleton instance
module.exports = new PDFProcessor();
